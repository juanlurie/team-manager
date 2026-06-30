using System.Net.Http.Headers;
using System.Text.Json;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace TeamManager.Api.Application.Services;

public record CalendarEventRecord(
    string Subject,
    string Start,
    string End,
    bool IsAllDay,
    string? Location
);

public class ConfigurableCalendarEventFetcher(AppDbContext db)
{
    public async Task<IReadOnlyList<CalendarEventRecord>> FetchAsync(string start, string end)
    {
        var configs = await db.ApiRequestConfigs
            .Where(c => c.Action == "FetchCalendarEvents" && c.Enabled)
            .ToListAsync();

        if (configs.Count == 0) return [];

        var configVars = await ConfigVariableResolver.LoadAsync(db);
        var results = new List<CalendarEventRecord>();

        foreach (var config in configs)
        {
            try
            {
                var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new();
                var secretHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(
                    string.IsNullOrWhiteSpace(config.SecretHeadersJson) ? "{}" : config.SecretHeadersJson) ?? new();
                var mapping = JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson) ?? new();

                var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

                foreach (var (k, v) in headers)
                    client.DefaultRequestHeaders.TryAddWithoutValidation(k, Resolve(ConfigVariableResolver.Apply(v, configVars), start, end));
                foreach (var (k, v) in secretHeaders)
                    client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

                var url = Resolve(ConfigVariableResolver.Apply(config.Url, configVars), start, end);
                HttpResponseMessage response;

                if (config.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
                {
                    var body = Resolve(ConfigVariableResolver.Apply(config.BodyTemplate, configVars), start, end);
                    var content = new StringContent(body);
                    content.Headers.ContentType = new MediaTypeHeaderValue(
                        config.IsFormUrlEncoded ? "application/x-www-form-urlencoded" : "application/json");
                    response = await client.PostAsync(url, content);
                }
                else
                {
                    response = await client.GetAsync(url);
                }

                if (!response.IsSuccessStatusCode) continue;

                var body2 = await response.Content.ReadAsStringAsync();
                var contentType = response.Content.Headers.ContentType?.MediaType ?? "";

                // ICS / iCalendar
                if (contentType.Contains("calendar") || body2.TrimStart().StartsWith("BEGIN:VCALENDAR"))
                {
                    var rangeStart = DateTimeOffset.TryParse(start, out var rs) ? rs : DateTimeOffset.MinValue;
                    var rangeEnd   = DateTimeOffset.TryParse(end,   out var re) ? re : DateTimeOffset.MaxValue;
                    results.AddRange(ParseIcs(body2, rangeStart, rangeEnd));
                    continue;
                }

                // JSON
                client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
                var root = JsonDocument.Parse(body2).RootElement;

                JsonElement array;
                if (!string.IsNullOrWhiteSpace(mapping.ArrayPath))
                {
                    array = NavigatePath(root, mapping.ArrayPath);
                    if (array.ValueKind != JsonValueKind.Array) continue;
                }
                else if (root.ValueKind == JsonValueKind.Array)
                {
                    array = root;
                }
                else continue;

                foreach (var item in array.EnumerateArray())
                {
                    var subject   = GetStr(item, mapping.SubjectPath) ?? "(No title)";
                    var itemStart = GetStr(item, mapping.StartPath) ?? "";
                    var itemEnd   = GetStr(item, mapping.EndPath) ?? "";
                    var isAllDay  = bool.TryParse(GetStr(item, mapping.IsAllDayPath), out var b) && b;
                    var location  = GetStr(item, mapping.LocationPath);
                    results.Add(new(subject, itemStart, itemEnd, isAllDay, location));
                }
            }
            catch { /* skip failed sources */ }
        }

        return results.OrderBy(e => e.Start).ToList();
    }

    // ── ICS parser ─────────────────────────────────────────────────────────────

    private static IEnumerable<CalendarEventRecord> ParseIcs(string ics, DateTimeOffset rangeStart, DateTimeOffset rangeEnd)
    {
        // Unfold lines (RFC 5545 §3.1: lines folded with CRLF + whitespace)
        var unfolded = ics
            .Replace("\r\n ", "").Replace("\r\n\t", "")
            .Replace("\n ", "").Replace("\n\t", "");

        var lines = unfolded.Split(["\r\n", "\n", "\r"], StringSplitOptions.None);

        var inEvent = false;
        var props   = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var results = new List<CalendarEventRecord>();

        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (line.Equals("BEGIN:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                inEvent = true;
                props.Clear();
                continue;
            }
            if (line.Equals("END:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                inEvent = false;
                var evt = BuildEvent(props, rangeStart, rangeEnd);
                if (evt is not null) results.Add(evt);
                continue;
            }
            if (!inEvent) continue;

            // Split name;params:value
            var colonIdx = line.IndexOf(':');
            if (colonIdx <= 0) continue;
            var namePart = line[..colonIdx];
            var value    = line[(colonIdx + 1)..];

            // Strip parameters (e.g. DTSTART;TZID=America/New_York → DTSTART)
            var semiIdx  = namePart.IndexOf(';');
            var propName = semiIdx >= 0 ? namePart[..semiIdx] : namePart;
            var paramStr = semiIdx >= 0 ? namePart[(semiIdx + 1)..] : "";

            // Store with params embedded so we can retrieve TZID later
            props[propName.ToUpperInvariant()] = value;
            if (!string.IsNullOrEmpty(paramStr))
                props[propName.ToUpperInvariant() + "__PARAMS"] = paramStr;
        }

        return results;
    }

    private static CalendarEventRecord? BuildEvent(Dictionary<string, string> props, DateTimeOffset rangeStart, DateTimeOffset rangeEnd)
    {
        if (props.TryGetValue("STATUS", out var status) && status.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase))
            return null;

        props.TryGetValue("SUMMARY",  out var summary);
        props.TryGetValue("LOCATION", out var location);
        props.TryGetValue("DTSTART",  out var dtStartRaw);
        props.TryGetValue("DTEND",    out var dtEndRaw);
        props.TryGetValue("DURATION", out var durationRaw);
        props.TryGetValue("DTSTART__PARAMS", out var startParams);
        props.TryGetValue("DTEND__PARAMS",   out var endParams);

        if (string.IsNullOrEmpty(dtStartRaw)) return null;

        var (startDto, isAllDay) = ParseIcsDate(dtStartRaw, startParams ?? "");
        DateTimeOffset endDto;

        if (!string.IsNullOrEmpty(dtEndRaw))
        {
            (endDto, _) = ParseIcsDate(dtEndRaw, endParams ?? "");
        }
        else if (!string.IsNullOrEmpty(durationRaw))
        {
            endDto = startDto + ParseIcsDuration(durationRaw);
        }
        else
        {
            endDto = isAllDay ? startDto.AddDays(1) : startDto.AddHours(1);
        }

        // Range filter
        if (endDto <= rangeStart || startDto >= rangeEnd) return null;

        var startIso = isAllDay
            ? startDto.ToString("yyyy-MM-ddT00:00:00")
            : startDto.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");
        var endIso = isAllDay
            ? endDto.ToString("yyyy-MM-ddT00:00:00")
            : endDto.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");

        return new(
            Subject:  UnescapeIcs(summary ?? "(No title)"),
            Start:    startIso,
            End:      endIso,
            IsAllDay: isAllDay,
            Location: string.IsNullOrEmpty(location) ? null : UnescapeIcs(location)
        );
    }

    private static (DateTimeOffset dt, bool isAllDay) ParseIcsDate(string value, string paramStr)
    {
        // All-day: VALUE=DATE or 8-digit date only
        var isValueDate = paramStr.Contains("VALUE=DATE", StringComparison.OrdinalIgnoreCase);
        var isAllDay    = isValueDate || (value.Length == 8 && !value.Contains('T'));

        if (isAllDay)
        {
            var dateStr = value.Length >= 8 ? value[..8] : value;
            if (DateTimeOffset.TryParseExact(dateStr, "yyyyMMdd",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal, out var d))
                return (d, true);
            return (DateTimeOffset.UtcNow, true);
        }

        // UTC: ends with Z
        if (value.EndsWith('Z'))
        {
            var fmt = value.Length == 16 ? "yyyyMMdd'T'HHmmss'Z'" : "yyyyMMdd'T'HHmmssZ";
            if (DateTimeOffset.TryParseExact(value, fmt,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal, out var d))
                return (d, false);
        }

        // Floating or TZID — parse as UTC (good enough for display)
        var cleanVal = value.Length >= 15 ? value[..15] : value;
        if (DateTimeOffset.TryParseExact(cleanVal, "yyyyMMdd'T'HHmmss",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal, out var dt))
            return (dt, false);

        return (DateTimeOffset.UtcNow, false);
    }

    private static TimeSpan ParseIcsDuration(string d)
    {
        // Simple P[n]DT[n]H[n]M[n]S parser
        var span = TimeSpan.Zero;
        d = d.TrimStart('-').TrimStart('P');
        var tIdx = d.IndexOf('T');
        var datePart = tIdx >= 0 ? d[..tIdx] : d;
        var timePart = tIdx >= 0 ? d[(tIdx + 1)..] : "";

        if (TryExtract(datePart, 'W', out var w)) span += TimeSpan.FromDays(w * 7);
        if (TryExtract(datePart, 'D', out var days)) span += TimeSpan.FromDays(days);
        if (TryExtract(timePart, 'H', out var h)) span += TimeSpan.FromHours(h);
        if (TryExtract(timePart, 'M', out var m)) span += TimeSpan.FromMinutes(m);
        if (TryExtract(timePart, 'S', out var s)) span += TimeSpan.FromSeconds(s);
        return span;
    }

    private static bool TryExtract(string s, char unit, out int value)
    {
        value = 0;
        var idx = s.IndexOf(unit);
        if (idx <= 0) return false;
        var numStr = s[..idx].TrimStart('+');
        return int.TryParse(numStr.Length > 0 ? numStr[^Math.Min(numStr.Length, 10)..] : numStr, out value);
    }

    private static string UnescapeIcs(string s) =>
        s.Replace("\\n", "\n").Replace("\\N", "\n")
         .Replace("\\,", ",").Replace("\\;", ";").Replace("\\\\", "\\");

    // ── JSON helpers ────────────────────────────────────────────────────────────

    private static string Resolve(string template, string start, string end) =>
        template.Replace("{start}", start).Replace("{end}", end);

    private static JsonElement NavigatePath(JsonElement root, string path)
    {
        var current = root;
        foreach (var seg in path.Split('.'))
        {
            if (current.ValueKind == JsonValueKind.Object && current.TryGetProperty(seg, out var next))
                current = next;
            else
                return default;
        }
        return current;
    }

    private static string? GetStr(JsonElement el, string path)
    {
        if (string.IsNullOrEmpty(path)) return null;
        var current = el;
        foreach (var seg in path.Split('.'))
        {
            if (current.ValueKind == JsonValueKind.Object && current.TryGetProperty(seg, out var next))
                current = next;
            else
                return null;
        }
        return current.ValueKind == JsonValueKind.String ? current.GetString() : current.GetRawText();
    }
}
