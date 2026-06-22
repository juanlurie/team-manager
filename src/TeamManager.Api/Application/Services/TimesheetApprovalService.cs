using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

// Builds the approval screen entirely from what the external timesheet system reports — no
// cross-referencing against our own TeamMembers table. The two rosters can legitimately differ
// (someone removed from this app may still need sign-off there, or vice versa), so matching
// against our internal list produced wrong/missing results.
public class TimesheetApprovalService(ITimesheetApprovalFetcher fetcher, AppDbContext db, IHttpClientFactory httpClientFactory) : ITimesheetApprovalService
{
    public async Task<TimesheetApprovalFetchResultDto> FetchOutstandingAsync(FetchTimesheetApprovalsRequest request)
    {
        var fetched = await fetcher.FetchAsync(request);
        var entries = fetched.Entries;

        var violationsByEntry = TimesheetApprovalRules.Evaluate(entries);

        var result = new List<TimesheetApprovalMemberDto>();
        foreach (var memberGroup in entries.GroupBy(e => e.MemberName))
        {
            var entryDtos = memberGroup
                .Select(e => new TimesheetApprovalEntryDto(
                    e.Date, e.Project, e.Category, e.Hours, e.Minutes, e.Billable,
                    e.WorkedFrom, e.Description, e.TicketNumber, e.ExternalId,
                    violationsByEntry[e]))
                .OrderBy(e => e.Date)
                .ToList();

            var violationCount = entryDtos.Sum(e => e.Violations.Count);
            if (violationCount == 0) continue;

            result.Add(new TimesheetApprovalMemberDto(
                memberGroup.Key,
                entryDtos,
                violationCount
            ));
        }

        var weeklySummary = BuildWeeklySummary(entries, fetched.EmployeeNames, fetched.PresentDays, request);
        var teams = fetched.EmployeeTeams.Values.Distinct().OrderBy(t => t).ToList();

        return new TimesheetApprovalFetchResultDto(
            result.OrderBy(m => m.MemberName).ToList(),
            weeklySummary,
            teams,
            fetched.EmployeeTeams
        );
    }

    // Analyzes exactly the people the caller has visible (after whatever team/needs-review
    // filtering is applied client-side) — reuses the same "AnalyzeTimesheetQuality" config as the
    // per-member timesheet tab button, since the AI call shape (URL/headers/body-template/Text
    // Response Path) is identical; only the prompt content differs.
    public async Task<TimesheetQualityAnalysisDto> AnalyzeQualityAsync(AnalyzeApprovalQualityRequest request)
    {
        var config = await db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == "AnalyzeTimesheetQuality" && c.Enabled);
        if (config is null) return new TimesheetQualityAnalysisDto(false, null, "not-configured");
        if (request.Members.Count == 0)
            return new TimesheetQualityAnalysisDto(true, "No one visible to analyze.", "skipped");

        var sb = new StringBuilder();
        foreach (var member in request.Members.OrderBy(m => m.MemberName))
        {
            if (member.Entries.Count == 0)
            {
                sb.AppendLine($"{member.MemberName}: {member.TotalHours:0.##}h logged this period, no flagged entries.");
                continue;
            }
            sb.AppendLine($"{member.MemberName}:");
            foreach (var e in member.Entries.OrderBy(e => e.Date))
            {
                var mins = e.Minutes > 0 ? $" {e.Minutes}m" : "";
                var desc = string.IsNullOrWhiteSpace(e.Description) ? "" : $" — \"{e.Description}\"";
                sb.AppendLine($"  {e.Date:yyyy-MM-dd} ({e.Date.DayOfWeek}): {e.Hours}h{mins} — {e.Project}/{e.Category}{(e.Billable ? "" : " (non-billable)")}{desc}");
            }
        }

        var prompt =
            "You are reviewing timesheet entries for a group of team members for quality concerns. Look for: " +
            "days or weeks with unusually low or high logged hours, inconsistent or suspicious patterns " +
            "(e.g. always exactly the same hours, repeated identical entries, large gaps with no entries on " +
            "workdays), vague or missing descriptions, or anything else suggesting inaccurate or low-effort " +
            "time tracking. Organize your findings by person — be concise, a short bullet list per person with " +
            "concerns, or \"No quality concerns found\" for that person if everything looks reasonable.\n\n" +
            $"Timesheet data for {request.Members.Count} people:\n{sb}";

        var escapedPrompt = prompt
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "");

        var parameters = string.IsNullOrWhiteSpace(config.ParametersJson)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(config.ParametersJson) ?? new();
        parameters["timesheetData"] = escapedPrompt;

        var headers = string.IsNullOrWhiteSpace(config.HeadersJson)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new();
        var mappingOpts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var mapping = string.IsNullOrWhiteSpace(config.MappingJson)
            ? new MappingConfigDto()
            : JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson, mappingOpts) ?? new();

        var publicConfigVars = await ConfigVariableResolver.LoadPublicAsync(db);
        var allConfigVars = await ConfigVariableResolver.LoadAsync(db);

        string ResolveForStorage(string template)
        {
            var result = ConfigVariableResolver.Apply(template, publicConfigVars);
            foreach (var (k, v) in parameters) result = result.Replace($"{{{k}}}", v);
            return result;
        }

        string ResolveForExecution(string template)
        {
            var result = ConfigVariableResolver.Apply(template, allConfigVars);
            foreach (var (k, v) in parameters) result = result.Replace($"{{{k}}}", v);
            return result;
        }

        // Every outbound integration call must be visible in the Sync Queue — log it before
        // executing, then update its status/response once the call completes.
        var evt = new ApiSyncEvent
        {
            Action = config.Action,
            ConfigName = config.Name,
            Label = $"Timesheet Quality — {request.Members.Count} people (approval screen)",
            SourceType = "TimesheetApprovalQualityAnalysis",
            HttpMethod = config.Method.ToUpper(),
            ResolvedUrl = ResolveForStorage(config.Url),
            ResolvedHeadersJson = JsonSerializer.Serialize(headers.ToDictionary(kvp => kvp.Key, kvp => ResolveForStorage(kvp.Value))),
            ResolvedBody = ResolveForStorage(config.BodyTemplate ?? ""),
            BodyFormat = config.BodyFormat ?? "json",
            Status = "pending"
        };
        db.ApiSyncEvents.Add(evt);
        await db.SaveChangesAsync();

        var executionHeaders = headers.ToDictionary(kvp => kvp.Key, kvp => ResolveForExecution(kvp.Value));
        var executionUrl = ResolveForExecution(config.Url);
        var executionBody = ResolveForExecution(config.BodyTemplate ?? "");

        string? analysis = null;
        try
        {
            using var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            foreach (var (k, v) in executionHeaders)
                client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

            var mediaType = (config.BodyFormat ?? "json") == "urlencoded"
                ? "application/x-www-form-urlencoded"
                : "application/json";
            var response = await client.PostAsync(executionUrl, new StringContent(executionBody, Encoding.UTF8, mediaType));
            var responseBody = await response.Content.ReadAsStringAsync();

            evt.ResponseStatus = (int)response.StatusCode;
            evt.ResponseBody = responseBody;
            evt.SentAt = DateTimeOffset.UtcNow;

            if (response.IsSuccessStatusCode)
            {
                evt.Status = "sent";
                analysis = WinOfTheWeekService.ExtractTextAtPath(responseBody, mapping.TextResponsePath)?.Trim();
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

        return new TimesheetQualityAnalysisDto(true, analysis, evt.Status);
    }

    // For each Monday-Sunday week overlapping the requested range, totals each employee's hours
    // (per the external system's own roster) for that week, and flags them missing if any day
    // that's actually present in the response (PresentDays) has zero entries for them — a day
    // present with an empty entries array means nothing was captured; a day absent entirely means
    // it was already signed off elsewhere and isn't part of this dataset, so it's excluded rather
    // than counted as missing. If the integration isn't configured with DayDatePath (no
    // day-level data available), falls back to the cruder "0 hours that week = missing".
    // Weeks (or the trailing part of one) that haven't happened yet are skipped. Doesn't account
    // for leave/public holidays, so someone fully on leave for a present day will still show up.
    private static IReadOnlyList<WeeklyTimesheetSummaryDto> BuildWeeklySummary(
        IReadOnlyList<ImportedTimesheetEntry> entries, IReadOnlyList<string> employeeNames,
        IReadOnlyList<MemberDay> presentDays, FetchTimesheetApprovalsRequest request)
    {
        if (!DateOnly.TryParse(request.Start, out var rangeStart) || !DateOnly.TryParse(request.End, out var rangeEnd))
            return [];

        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var entriesByNameLower = entries.GroupBy(e => e.MemberName.ToLower()).ToDictionary(g => g.Key, g => g.ToList());
        var loggedDatesByNameLower = entries.GroupBy(e => e.MemberName.ToLower()).ToDictionary(g => g.Key, g => g.Select(e => e.Date).ToHashSet());
        var presentDaysByNameLower = presentDays.GroupBy(d => d.MemberName.ToLower()).ToDictionary(g => g.Key, g => g.Select(d => d.Date).ToHashSet());
        var hasPresentDayData = presentDays.Count > 0;

        var weeks = new List<WeeklyTimesheetSummaryDto>();
        var daysSinceMonday = rangeStart.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)rangeStart.DayOfWeek - 1;
        var cursor = rangeStart.AddDays(-daysSinceMonday);

        while (cursor <= rangeEnd)
        {
            var weekStart = cursor;
            var weekEnd = cursor.AddDays(6);
            cursor = cursor.AddDays(7);

            var clippedStart = weekStart < rangeStart ? rangeStart : weekStart;
            var clippedEnd = weekEnd > rangeEnd ? rangeEnd : weekEnd;
            if (clippedEnd > today) clippedEnd = today;
            if (clippedStart > clippedEnd) continue; // entirely in the future

            var hasWeekday = Enumerable.Range(0, clippedEnd.DayNumber - clippedStart.DayNumber + 1)
                .Select(clippedStart.AddDays)
                .Any(d => d.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday);
            if (!hasWeekday) continue;

            var memberHours = employeeNames
                .Select(name => new MemberWeekHoursDto(
                    name,
                    entriesByNameLower.GetValueOrDefault(name.ToLower())?
                        .Where(e => e.Date >= clippedStart && e.Date <= clippedEnd)
                        .Sum(e => e.Hours + e.Minutes / 60m) ?? 0m))
                .OrderBy(m => m.Hours)
                .ThenBy(m => m.MemberName)
                .ToList();

            var missing = employeeNames
                .Where(name =>
                {
                    var nameLower = name.ToLower();
                    if (!hasPresentDayData)
                        return (entriesByNameLower.GetValueOrDefault(nameLower)?
                            .Where(e => e.Date >= clippedStart && e.Date <= clippedEnd)
                            .Sum(e => e.Hours + e.Minutes / 60m) ?? 0m) == 0m;

                    var present = presentDaysByNameLower.GetValueOrDefault(nameLower);
                    if (present is null) return false; // nothing outstanding for them this week
                    var logged = loggedDatesByNameLower.GetValueOrDefault(nameLower);
                    return present.Any(d => d >= clippedStart && d <= clippedEnd && (logged is null || !logged.Contains(d)));
                })
                .OrderBy(name => name)
                .ToList();

            weeks.Add(new WeeklyTimesheetSummaryDto(weekStart, weekEnd, memberHours, missing));
        }

        return weeks;
    }
}
