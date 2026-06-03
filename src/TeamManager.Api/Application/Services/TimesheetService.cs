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
        return entries.Select(ToDto).ToList();
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
        await EnqueueSyncEventAsync(entry);
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
        db.TimesheetEntries.Remove(entry);
        await db.SaveChangesAsync();
        await eventPublisher.PublishAsync("deleted", dto);
        return true;
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

    private async Task EnqueueSyncEventAsync(TimesheetEntry entry)
    {
        try
        {
            var config = await db.ApiRequestConfigs
                .FirstOrDefaultAsync(c => c.Action == "AddTimesheetEntry" && c.Enabled);
            if (config is null) return;

            var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? [];
            var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(
                string.IsNullOrWhiteSpace(config.ParametersJson) ? "{}" : config.ParametersJson) ?? [];
            var cookie = config.StoredCookie ?? "{cookie}";

            string Resolve(string t)
            {
                var result = t
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
                return result;
            }

            var resolvedHeaders = headers.ToDictionary(kvp => kvp.Key, kvp => Resolve(kvp.Value));
            var mins = entry.Minutes > 0 ? $" {entry.Minutes}m" : "";
            var label = $"{entry.Date:yyyy-MM-dd} | {entry.Project} | {entry.Hours}h{mins}";
            if (!string.IsNullOrEmpty(entry.Description)) label += $" | {entry.Description}";

            db.ApiSyncEvents.Add(new ApiSyncEvent
            {
                Action = "AddTimesheetEntry",
                ConfigName = config.Name,
                Label = label,
                SourceId = entry.Id.ToString(),
                SourceType = "TimesheetEntry",
                ResolvedUrl = Resolve(config.Url),
                ResolvedHeadersJson = JsonSerializer.Serialize(resolvedHeaders),
                ResolvedBody = Resolve(config.BodyTemplate),
                BodyFormat = config.BodyFormat ?? "urlencoded"
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

    private static TimesheetEntryDto ToDto(TimesheetEntry e) => new(
        e.Id, e.TeamMemberId, e.Date, e.Project, e.Category,
        e.Hours, e.Minutes, e.Billable, e.WorkedFrom, e.Sentiment,
        e.Description, e.TicketNumber, e.CreatedAt, e.ExternalId
    );

    private static string CellRef(string col, uint row) => $"{col}{row}";

    private static Cell InlineStringCell(string cellRef, string value) => new()
    {
        CellReference = cellRef,
        DataType = CellValues.InlineString,
        InlineString = new InlineString { Text = new Text(value) }
    };
}
