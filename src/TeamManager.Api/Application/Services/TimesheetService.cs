using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TimesheetService(AppDbContext db) : ITimesheetService
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
        return ToDto(entry);
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
        return ToDto(entry);
    }

    public async Task<bool> DeleteAsync(Guid memberId, Guid entryId)
    {
        var entry = await db.TimesheetEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.TeamMemberId == memberId);
        if (entry is null) return false;
        db.TimesheetEntries.Remove(entry);
        await db.SaveChangesAsync();
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

    private static void ValidateMinutes(int minutes)
    {
        if (!ValidMinutes.Contains(minutes))
            throw new InvalidOperationException("Minutes must be 0, 15, 30, or 45.");
    }

    private static TimesheetEntryDto ToDto(TimesheetEntry e) => new(
        e.Id, e.TeamMemberId, e.Date, e.Project, e.Category,
        e.Hours, e.Minutes, e.Billable, e.WorkedFrom, e.Sentiment,
        e.Description, e.TicketNumber, e.CreatedAt
    );

    private static string CellRef(string col, uint row) => $"{col}{row}";

    private static Cell InlineStringCell(string cellRef, string value) => new()
    {
        CellReference = cellRef,
        DataType = CellValues.InlineString,
        InlineString = new InlineString { Text = new Text(value) }
    };
}
