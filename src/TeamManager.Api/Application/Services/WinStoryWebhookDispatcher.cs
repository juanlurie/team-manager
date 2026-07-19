using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// Fans a generated win story out to any configured "AiChatWinStory" webhooks. Lifted out of
/// WinOfTheWeekService: raw outbound HTTP is an infrastructure concern, not part of the Win of the
/// Week domain. Uses IHttpClientFactory rather than <c>new HttpClient()</c> per call to avoid
/// socket exhaustion.
/// </summary>
public class WinStoryWebhookDispatcher(AppDbContext db, IHttpClientFactory httpClientFactory)
{
    public async Task DispatchAsync(string story, string winnerName, Guid weekId)
    {
        var webhooks = await db.ApiRequestConfigs
            .Where(c => c.Action == "AiChatWinStory" && !c.IsAiConnection && c.Enabled)
            .ToListAsync();

        if (webhooks.Count == 0) return;

        var escaped = JsonSerializer.Serialize(story)[1..^1]; // JSON-escape without surrounding quotes
        var events = webhooks.Select(w => new ApiSyncEvent
        {
            Action = w.Action,
            ConfigName = w.Name,
            Label = $"Win Story — {winnerName}",
            SourceType = "WinWeek",
            SourceId = weekId.ToString(),
            HttpMethod = w.Method.ToUpper(),
            ResolvedUrl = w.Url,
            ResolvedHeadersJson = w.HeadersJson,
            ResolvedBody = (w.BodyTemplate ?? "").Replace("{userMessage}", escaped),
            BodyFormat = w.BodyFormat,
            Status = "pending"
        }).ToList();

        db.ApiSyncEvents.AddRange(events);
        await db.SaveChangesAsync();

        foreach (var evt in events)
        {
            try
            {
                var client = httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);
                var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(
                    string.IsNullOrWhiteSpace(evt.ResolvedHeadersJson) ? "{}" : evt.ResolvedHeadersJson) ?? [];

                var mediaType = evt.BodyFormat == "urlencoded" ? "application/x-www-form-urlencoded" : "application/json";
                using var content = new StringContent(evt.ResolvedBody, Encoding.UTF8, mediaType);
                // Per-request headers on the message, not the shared factory client, which is reused.
                using var request = new HttpRequestMessage(HttpMethod.Post, evt.ResolvedUrl) { Content = content };
                foreach (var (k, v) in headers) request.Headers.TryAddWithoutValidation(k, v);

                var response = await client.SendAsync(request);
                evt.ResponseStatus = (int)response.StatusCode;
                evt.ResponseBody = await response.Content.ReadAsStringAsync();
                evt.SentAt = DateTimeOffset.UtcNow;
                evt.Status = response.IsSuccessStatusCode ? "sent" : "failed";
            }
            catch (Exception ex)
            {
                evt.Status = "failed";
                evt.ResponseBody = ex.Message;
            }
        }
        await db.SaveChangesAsync();
    }
}
