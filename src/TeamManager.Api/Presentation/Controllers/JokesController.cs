using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/jokes")]
[Authorize]
[RequireFeature("jokes")]
public class JokesController(AppDbContext db, IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpGet("configured")]
    public async Task<IActionResult> IsConfigured()
    {
        var enabled = await db.ApiRequestConfigs.AnyAsync(c => c.Action == "GenerateJoke" && c.Enabled);
        return Ok(new { configured = enabled });
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateJoke([FromBody] GenerateJokeRequest request)
    {
        var config = await db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == "GenerateJoke" && c.Enabled);
        if (config is null)
            return Ok(new { configured = false });

        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(
            string.IsNullOrWhiteSpace(config.ParametersJson) ? "{}" : config.ParametersJson) ?? [];
        parameters["jokeType"] = request.JokeType;

        var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? [];

        string Resolve(string t)
        {
            var result = t;
            foreach (var (k, v) in parameters)
                result = result.Replace($"{{{k}}}", v);
            return result;
        }

        var resolvedHeaders = headers.ToDictionary(kvp => kvp.Key, kvp => Resolve(kvp.Value));

        // Create a visible sync event so it appears in the queue
        var evt = new Domain.Entities.ApiSyncEvent
        {
            Action = config.Action,
            ConfigName = config.Name,
            Label = $"Joke — {request.JokeLabel}",
            SourceType = "Joke",
            HttpMethod = config.Method.ToUpper(),
            ResolvedUrl = Resolve(config.Url),
            ResolvedHeadersJson = JsonSerializer.Serialize(resolvedHeaders),
            ResolvedBody = Resolve(config.BodyTemplate),
            BodyFormat = config.BodyFormat ?? "json",
            Status = "pending"
        };

        db.ApiSyncEvents.Add(evt);
        await db.SaveChangesAsync();

        // Execute immediately
        string? joke = null;
        try
        {
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            foreach (var (k, v) in resolvedHeaders)
                client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

            HttpResponseMessage response;
            if (config.Method.ToUpper() == "GET")
                response = await client.GetAsync(evt.ResolvedUrl);
            else
            {
                var mediaType = config.BodyFormat == "urlencoded"
                    ? "application/x-www-form-urlencoded"
                    : "application/json";
                response = await client.PostAsync(evt.ResolvedUrl,
                    new StringContent(evt.ResolvedBody, Encoding.UTF8, mediaType));
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            evt.ResponseStatus = (int)response.StatusCode;
            evt.ResponseBody = responseBody;
            evt.SentAt = DateTimeOffset.UtcNow;

            if (response.IsSuccessStatusCode)
            {
                evt.Status = "sent";
                joke = ExtractText(config.MappingJson, responseBody);
            }
            else
            {
                evt.Status = "failed";
            }
        }
        catch (Exception ex)
        {
            evt.Status = "failed";
            evt.ResponseBody = ex.Message;
            evt.SentAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync();

        await WebSocketMiddleware.BroadcastAsync("joke_generated", new
        {
            jokeTypeId = request.JokeTypeId,
            joke,
            eventId = evt.Id,
            status = evt.Status
        });

        return Ok(new { configured = true, eventId = evt.Id, joke, status = evt.Status });
    }

    private static readonly JsonSerializerOptions CaseInsensitive = new() { PropertyNameCaseInsensitive = true };

    private static string? ExtractText(string mappingJson, string responseBody)
    {
        try
        {
            var mapping = JsonSerializer.Deserialize<MappingRef>(mappingJson, CaseInsensitive);
            var path = mapping?.TextResponsePath ?? "";
            if (string.IsNullOrEmpty(path)) return null;

            var el = JsonDocument.Parse(responseBody).RootElement;
            foreach (var part in path.Split('.'))
            {
                var bracketIdx = part.IndexOf('[');
                if (bracketIdx >= 0)
                {
                    var propName = part[..bracketIdx];
                    var idx = int.Parse(part[(bracketIdx + 1)..part.IndexOf(']')]);
                    if (!el.TryGetProperty(propName, out el)) return null;
                    el = el[idx];
                }
                else if (int.TryParse(part, out var arrIdx))
                {
                    if (el.ValueKind != JsonValueKind.Array || arrIdx >= el.GetArrayLength()) return null;
                    el = el[arrIdx];
                }
                else
                {
                    if (!el.TryGetProperty(part, out el)) return null;
                }
            }
            return el.ValueKind == JsonValueKind.String ? el.GetString() : null;
        }
        catch { return null; }
    }

    private record MappingRef(string? TextResponsePath);
}

public record GenerateJokeRequest(string JokeType, string JokeLabel, string JokeTypeId);
