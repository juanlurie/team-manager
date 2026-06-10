using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TimesheetService(AppDbContext db, ITimesheetEventPublisher eventPublisher, IHttpClientFactory httpClientFactory) : ITimesheetService
{
    private static readonly int[] ValidMinutes = [0, 15, 30, 45];

    public async Task<IReadOnlyList<TimesheetEntryDto>> GetByMonthAsync(Guid memberId, int year, int month)
    {
        var entries = await db.TimesheetEntries
            .Where(e => e.TeamMemberId == memberId && e.Date.Year == year && e.Date.Month == month)
            .OrderBy(e => e.Date)
            .ThenBy(e => e.CreatedAt)
            .ToListAsync();

        var entryIds = entries.Select(e => e.Id.ToString()).ToHashSet();
        var syncStatuses = await db.ApiSyncEvents
            .Where(e => e.SourceId != null && entryIds.Contains(e.SourceId)
                        && (e.Status == "pending" || e.Status == "failed"))
            .GroupBy(e => e.SourceId!)
            .Select(g => new { SourceId = g.Key, HasFailed = g.Any(e => e.Status == "failed") })
            .ToDictionaryAsync(x => x.SourceId, x => x.HasFailed ? "failed" : "pending");

        return entries.Select(e => ToDto(e, syncStatuses.GetValueOrDefault(e.Id.ToString()))).ToList();
    }

    public async Task<TimesheetEntryDto> CreateAsync(Guid memberId, CreateTimesheetEntryRequest req)
    {
        ValidateMinutes(req.Minutes);
        var entry = new TimesheetEntry
        {
            TeamMemberId = memberId,
            Date = req.Date,
            Project = req.Project,
            Category = req.Category,
            Hours = req.Hours,
            Minutes = req.Minutes,
            Billable = req.Billable,
            WorkedFrom = req.WorkedFrom,
            Sentiment = req.Sentiment,
            Description = req.Description,
            TicketNumber = req.TicketNumber
        };
        db.TimesheetEntries.Add(entry);
        await db.SaveChangesAsync();
        await EnqueueTimesheetActionAsync("AddTimesheetEntry", entry);
        var dto = ToDto(entry);
        await eventPublisher.PublishAsync("created", dto);
        return dto;
    }

    public async Task<TimesheetEntryDto?> UpdateAsync(Guid memberId, Guid entryId, UpdateTimesheetEntryRequest req)
    {
        ValidateMinutes(req.Minutes);
        var entry = await db.TimesheetEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.TeamMemberId == memberId);
        if (entry is null) return null;

        entry.Date = req.Date;
        entry.Project = req.Project;
        entry.Category = req.Category;
        entry.Hours = req.Hours;
        entry.Minutes = req.Minutes;
        entry.Billable = req.Billable;
        entry.WorkedFrom = req.WorkedFrom;
        entry.Sentiment = req.Sentiment;
        entry.Description = req.Description;
        entry.TicketNumber = req.TicketNumber;

        await db.SaveChangesAsync();
        await EnqueueTimesheetActionAsync("EditTimesheetEntry", entry);
        var dto = ToDto(entry);
        await eventPublisher.PublishAsync("updated", dto);
        return dto;
    }

    public async Task<bool> DeleteAsync(Guid memberId, Guid entryId)
    {
        var entry = await db.TimesheetEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.TeamMemberId == memberId);
        if (entry is null) return false;
        var dto = ToDto(entry);
        var pendingAdd = await db.ApiSyncEvents.FirstOrDefaultAsync(e =>
            e.SourceId == entry.Id.ToString() &&
            e.Action == "AddTimesheetEntry" &&
            e.Status == "pending");
        if (pendingAdd is not null)
            pendingAdd.Status = "dismissed";
        else
            await EnqueueTimesheetActionAsync("DeleteTimesheetEntry", entry);
        db.TimesheetEntries.Remove(entry);
        await db.SaveChangesAsync();
        await eventPublisher.PublishAsync("deleted", dto);
        return true;
    }

    public async Task<int> EnqueueSyncAsync(Guid memberId, Guid[] entryIds)
    {
        var entries = await db.TimesheetEntries
            .Where(e => e.TeamMemberId == memberId && entryIds.Contains(e.Id) && e.ExternalId == null)
            .ToListAsync();
        foreach (var entry in entries)
            await EnqueueTimesheetActionAsync("AddTimesheetEntry", entry);
        return entries.Count;
    }

    public async Task<byte[]> ExportMonthAsync(Guid memberId, int year, int month)
    {
        var entries = await db.TimesheetEntries
            .Where(e => e.TeamMemberId == memberId && e.Date.Year == year && e.Date.Month == month)
            .OrderBy(e => e.Date)
            .ThenBy(e => e.CreatedAt)
            .ToListAsync();

        var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "TimesheetUpload.xlsx");
        var mem = new MemoryStream();
        using (var src = File.OpenRead(templatePath))
            src.CopyTo(mem);
        mem.Position = 0;

        using (var doc = SpreadsheetDocument.Open(mem, isEditable: true))
        {
            var workbookPart = doc.WorkbookPart!;
            var firstSheet = workbookPart.Workbook.Sheets!.Elements<Sheet>().First();
            var wsPart = (WorksheetPart)workbookPart.GetPartById(firstSheet.Id!.Value!);
            var sheetData = wsPart.Worksheet.GetFirstChild<SheetData>()!;

            // Remove all rows except the header (row 1)
            var rowsToRemove = sheetData.Elements<Row>()
                .Where(r => r.RowIndex?.Value > 1)
                .ToList();
            foreach (var r in rowsToRemove)
                r.Remove();

            // Strip data validations so dropdown formulas don't interfere with exported text values
            wsPart.Worksheet.GetFirstChild<DataValidations>()?.Remove();

            // Remove Lookup and Validation helper sheets — not needed in exports
            var sheets = workbookPart.Workbook.Sheets!.Elements<Sheet>().Skip(1).ToList();
            foreach (var sheet in sheets)
            {
                workbookPart.DeletePart(workbookPart.GetPartById(sheet.Id!.Value!));
                sheet.Remove();
            }

            // Append one row per entry
            var rowIndex = 2u;
            foreach (var entry in entries)
            {
                var row = new Row { RowIndex = rowIndex };
                row.Append(
                    InlineStringCell(CellRef("A", rowIndex), entry.Date.ToString("yyyy-MM-dd")),
                    InlineStringCell(CellRef("B", rowIndex), entry.Project),
                    InlineStringCell(CellRef("C", rowIndex), entry.Category),
                    InlineStringCell(CellRef("D", rowIndex), entry.Hours.ToString()),
                    InlineStringCell(CellRef("E", rowIndex), entry.Minutes.ToString()),
                    InlineStringCell(CellRef("F", rowIndex), entry.Billable ? "Yes" : "No"),
                    InlineStringCell(CellRef("G", rowIndex), entry.Description ?? ""),
                    InlineStringCell(CellRef("H", rowIndex), entry.TicketNumber ?? ""),
                    InlineStringCell(CellRef("I", rowIndex), entry.Sentiment),
                    InlineStringCell(CellRef("J", rowIndex), entry.WorkedFrom)
                );
                sheetData.Append(row);
                rowIndex++;
            }

            doc.Save();
        }

        return mem.ToArray();
    }

    private async Task EnqueueTimesheetActionAsync(string action, TimesheetEntry entry)
    {
        try
        {
            // If editing an entry that still has a pending Add, refresh that Add event
            // with the current entry data instead of queuing a separate Edit event.
            // This check runs before any config loading so it fires regardless of whether
            // an EditTimesheetEntry config is configured.
            if (action == "EditTimesheetEntry")
            {
                var pendingAdd = await db.ApiSyncEvents.FirstOrDefaultAsync(e =>
                    e.SourceId == entry.Id.ToString() &&
                    e.Action == "AddTimesheetEntry" &&
                    e.Status == "pending");
                if (pendingAdd is not null)
                {
                    db.ApiSyncEvents.Remove(pendingAdd);
                    await db.SaveChangesAsync();
                    await EnqueueTimesheetActionAsync("AddTimesheetEntry", entry);
                    return;
                }
            }

            var config = await db.ApiRequestConfigs
                .FirstOrDefaultAsync(c => c.Action == action && c.Enabled);
            if (config is null) return;

            var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? [];
            var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(
                string.IsNullOrWhiteSpace(config.ParametersJson) ? "{}" : config.ParametersJson) ?? [];
            var cookie = config.StoredCookie ?? "{cookie}";

            // Resolve member-specific correlation IDs
            var memberCfg = await db.MemberTimesheetConfigs.FindAsync(entry.TeamMemberId);
            if (memberCfg is not null)
            {
                var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                if (!string.IsNullOrWhiteSpace(memberCfg.ExternalEmployeeId))
                    parameters["employeeId"] = memberCfg.ExternalEmployeeId;
                var catIds = JsonSerializer.Deserialize<Dictionary<string, string>>(
                    string.IsNullOrWhiteSpace(memberCfg.CategoryCorrelationIdsJson) ? "{}" : memberCfg.CategoryCorrelationIdsJson, opts) ?? [];
                if (catIds.TryGetValue(entry.Category, out var catId))
                    parameters["categoryId"] = catId;
                var locIds = JsonSerializer.Deserialize<Dictionary<string, string>>(
                    string.IsNullOrWhiteSpace(memberCfg.WorkLocationCorrelationIdsJson) ? "{}" : memberCfg.WorkLocationCorrelationIdsJson, opts) ?? [];
                if (!string.IsNullOrWhiteSpace(entry.WorkedFrom) && locIds.TryGetValue(entry.WorkedFrom, out var locId))
                    parameters["workedFromLocationId"] = locId;
            }

            // If the entry has no ExternalId, look it up from a previously sent Add event
            var timesheetEntryExternalId = entry.ExternalId;
            if (string.IsNullOrEmpty(timesheetEntryExternalId))
            {
                var addEvent = await db.ApiSyncEvents
                    .Where(e => e.SourceId == entry.Id.ToString() && e.Action == "AddTimesheetEntry" && e.ExternalId != null)
                    .OrderByDescending(e => e.SentAt)
                    .FirstOrDefaultAsync();
                if (!string.IsNullOrEmpty(addEvent?.ExternalId))
                {
                    timesheetEntryExternalId = addEvent.ExternalId;
                    entry.ExternalId = timesheetEntryExternalId;
                }
            }

            var configVars = await ConfigVariableResolver.LoadAsync(db);

            string Resolve(string t)
            {
                var result = ConfigVariableResolver.Apply(t, configVars)
                    .Replace("{cookie}", cookie)
                    .Replace("{id}", entry.Id.ToString())
                    .Replace("{date}", entry.Date.ToString("yyyy-MM-dd"))
                    .Replace("{project}", entry.Project)
                    .Replace("{category}", entry.Category)
                    .Replace("{hours}", entry.Hours.ToString())
                    .Replace("{minutes}", entry.Minutes.ToString())
                    .Replace("{billable}", entry.Billable.ToString().ToLower())
                    .Replace("{workedFrom}", entry.WorkedFrom)
                    .Replace("{sentiment}", entry.Sentiment)
                    .Replace("{description}", entry.Description ?? "")
                    .Replace("{ticketNumber}", entry.TicketNumber ?? "");
                foreach (var (key, value) in parameters)
                    result = result.Replace($"{{{key}}}", value);
                if (!string.IsNullOrEmpty(timesheetEntryExternalId))
                    result = result.Replace("{timesheetEntryId}", timesheetEntryExternalId);
                return result;
            }

            var resolvedHeaders = headers.ToDictionary(kvp => kvp.Key, kvp => Resolve(kvp.Value));
            var secretHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(
                string.IsNullOrWhiteSpace(config.SecretHeadersJson) ? "{}" : config.SecretHeadersJson) ?? [];
            foreach (var (k, v) in secretHeaders) resolvedHeaders[k] = v;
            var mins = entry.Minutes > 0 ? $" {entry.Minutes}m" : "";
            var label = $"{entry.Date:yyyy-MM-dd} | {entry.Project} | {entry.Hours}h{mins}";
            if (!string.IsNullOrEmpty(entry.Description)) label += $" | {entry.Description}";

            var resolvedUrl = Resolve(config.Url);
            var resolvedBody = Resolve(config.BodyTemplate);
            var resolvedHeadersJson = JsonSerializer.Serialize(resolvedHeaders);
            var bodyFormat = config.BodyFormat ?? "urlencoded";

            // For edit events, optionally replace an existing pending event for the same entry
            if (action == "EditTimesheetEntry" && memberCfg?.DeduplicatePendingEditSync == true)
            {
                var existing = await db.ApiSyncEvents.FirstOrDefaultAsync(e =>
                    e.SourceId == entry.Id.ToString() &&
                    e.Action == "EditTimesheetEntry" &&
                    e.Status == "pending");

                if (existing is not null)
                {
                    existing.ConfigName = config.Name;
                    existing.Label = label;
                    existing.HttpMethod = config.Method.ToUpper();
                    existing.ResolvedUrl = resolvedUrl;
                    existing.ResolvedHeadersJson = resolvedHeadersJson;
                    existing.ResolvedBody = resolvedBody;
                    existing.BodyFormat = bodyFormat;
                    await db.SaveChangesAsync();
                    return;
                }
            }

            db.ApiSyncEvents.Add(new ApiSyncEvent
            {
                Action = action,
                ConfigName = config.Name,
                Label = label,
                SourceId = entry.Id.ToString(),
                SourceType = "TimesheetEntry",
                HttpMethod = config.Method.ToUpper(),
                ResolvedUrl = resolvedUrl,
                ResolvedHeadersJson = resolvedHeadersJson,
                ResolvedBody = resolvedBody,
                BodyFormat = bodyFormat,
                ExternalId = entry.ExternalId,
            });
            await db.SaveChangesAsync();
        }
        catch (Exception)
        {
            // Don't fail the create if queuing fails
        }
    }

    private static string? ResolvePath(JsonElement root, string path)
    {
        var parts = path.Split('.');
        var current = root;
        foreach (var part in parts)
        {
            if (current.ValueKind != JsonValueKind.Object) return null;
            if (!current.TryGetProperty(part, out current)) return null;
        }
        return current.ValueKind == JsonValueKind.Null ? null : current.ToString();
    }

    private record MappingJson(string ExternalIdPath = "");

    private static void ValidateMinutes(int minutes)
    {
        if (!ValidMinutes.Contains(minutes))
            throw new InvalidOperationException("Minutes must be 0, 15, 30, or 45.");
    }

    private static TimesheetEntryDto ToDto(TimesheetEntry e, string? syncStatus = null) => new(
        e.Id, e.TeamMemberId, e.Date, e.Project, e.Category,
        e.Hours, e.Minutes, e.Billable, e.WorkedFrom, e.Sentiment,
        e.Description, e.TicketNumber, e.CreatedAt, e.ExternalId, syncStatus
    );

    private static string CellRef(string col, uint row) => $"{col}{row}";

    private static Cell InlineStringCell(string cellRef, string value) => new()
    {
        CellReference = cellRef,
        DataType = CellValues.InlineString,
        InlineString = new InlineString { Text = new Text(value) }
    };
}
