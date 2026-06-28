using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.LeaveRecord;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class LeaveService(AppDbContext db, ILeaveFetcher leaveFetcher) : ILeaveService
{
    public async Task<IReadOnlyList<LeaveRecordDto>> GetAllAsync(Guid? teamMemberId, Guid? sprintId, DateOnly? from = null, DateOnly? to = null)
    {
        var query = db.LeaveRecords
            .Include(l => l.TeamMember)
            .AsQueryable();

        if (teamMemberId.HasValue)
            query = query.Where(l => l.TeamMemberId == teamMemberId);

        if (sprintId.HasValue)
        {
            var sprint = await db.Sprints.FindAsync(sprintId);
            if (sprint is not null)
            {
                var memberIds = await db.SprintMembers
                    .Where(sm => sm.SprintId == sprintId)
                    .Select(sm => sm.TeamMemberId)
                    .ToListAsync();

                query = query.Where(l =>
                    memberIds.Contains(l.TeamMemberId) &&
                    l.StartDate <= sprint.EndDate &&
                    l.EndDate >= sprint.StartDate);
            }
        }

        if (from.HasValue)
            query = query.Where(l => l.EndDate >= from.Value);

        if (to.HasValue)
            query = query.Where(l => l.StartDate <= to.Value);

        var records = await query.OrderBy(l => l.StartDate).ToListAsync();
        return records.Select(ToDto).ToList();
    }

    public async Task<LeaveRecordDto> CreateAsync(CreateLeaveRecordRequest request)
    {
        var record = new LeaveRecord
        {
            TeamMemberId = request.TeamMemberId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Type = request.Type,
            DaysCount = request.DaysCount,
            Notes = request.Notes
        };
        db.LeaveRecords.Add(record);
        await db.SaveChangesAsync();
        await db.Entry(record).Reference(r => r.TeamMember).LoadAsync();
        return ToDto(record);
    }

    public async Task<LeaveRecordDto?> UpdateAsync(Guid id, CreateLeaveRecordRequest request)
    {
        var record = await db.LeaveRecords.Include(l => l.TeamMember).FirstOrDefaultAsync(l => l.Id == id);
        if (record is null) return null;

        record.TeamMemberId = request.TeamMemberId;
        record.StartDate = request.StartDate;
        record.EndDate = request.EndDate;
        record.Type = request.Type;
        record.DaysCount = request.DaysCount;
        record.Notes = request.Notes;

        await db.SaveChangesAsync();
        return ToDto(record);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var record = await db.LeaveRecords.FindAsync(id);
        if (record is null) return false;
        db.LeaveRecords.Remove(record);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<ImportLeaveResult> ImportAsync(ImportLeaveRequest request)
    {
        var members = await db.TeamMembers
            .Where(m => m.IsActive)
            .Select(m => new { m.Id, FullName = (m.FirstName + " " + m.LastName).ToLower() })
            .ToListAsync();

        var memberLookup = members.ToDictionary(m => m.FullName, m => m.Id);

        var existing = await db.LeaveRecords
            .Select(l => new { l.Id, l.TeamMemberId, l.StartDate, l.Type })
            .ToListAsync();

        // Map from dedup key → existing record Id so we can delete on override
        var existingMap = existing
            .ToDictionary(e => $"{e.TeamMemberId}|{e.StartDate}|{e.Type}", e => e.Id);

        var unknownNames = new HashSet<string>();
        var toInsert    = new List<LeaveRecord>();
        var toDelete    = new List<Guid>();
        var processedKeys = new HashSet<string>();
        int newCount      = 0;
        int overrideCount = 0;
        int skipCount     = 0;

        foreach (var r in request.Records)
        {
            var name = ExtractName(r.Title).ToLower();
            if (!memberLookup.TryGetValue(name, out var memberId))
            {
                unknownNames.Add(ExtractName(r.Title));
                continue;
            }

            var startDate = DateOnly.FromDateTime(DateTime.Parse(r.Start));
            var leaveType = ParseLeaveType(r.Type);
            var key = $"{memberId}|{startDate}|{leaveType}";

            if (processedKeys.Contains(key)) continue;
            processedKeys.Add(key);

            if (existingMap.TryGetValue(key, out var existingId))
            {
                if (!request.Override) { skipCount++; continue; }
                toDelete.Add(existingId);
                overrideCount++;
            }
            else
            {
                newCount++;
            }

            toInsert.Add(new LeaveRecord
            {
                TeamMemberId = memberId,
                StartDate    = startDate,
                EndDate      = DateOnly.FromDateTime(DateTime.Parse(r.End).AddDays(-1)),
                Type         = leaveType,
                DaysCount    = decimal.TryParse(r.TotalDays, out var d) ? d : 1,
                Notes        = $"Imported ({r.Status})"
            });
        }

        if (toDelete.Count > 0)
        {
            var recordsToRemove = await db.LeaveRecords.Where(l => toDelete.Contains(l.Id)).ToListAsync();
            db.LeaveRecords.RemoveRange(recordsToRemove);
        }

        db.LeaveRecords.AddRange(toInsert);
        await db.SaveChangesAsync();

        return new ImportLeaveResult(newCount, overrideCount, skipCount, unknownNames.ToList());
    }

    private static string ExtractName(string title) =>
        title.Split(" - ")[0].Trim();

    public async Task<IReadOnlyList<ImportLeaveRecord>> FetchPreviewAsync(FetchLeaveRequest request)
    {
        if (!leaveFetcher.IsConfigured)
            throw new InvalidOperationException("Leave fetching is not configured. Add a LeaveFetch section to appsettings.json.");

        return await leaveFetcher.FetchAsync(request);
    }

    public async Task<ImportLeaveResult> FetchAndImportAsync(FetchLeaveRequest request)
    {
        var records = await FetchPreviewAsync(request);
        return await ImportAsync(new ImportLeaveRequest(records));
    }

    private static LeaveType ParseLeaveType(string type) => type.Replace(" ", "") switch
    {
        "Annual"               => LeaveType.Annual,
        "Sick"                 => LeaveType.Sick,
        "Birthday"             => LeaveType.Birthday,
        "Loyalty"              => LeaveType.Loyalty,
        "Discretionary"        => LeaveType.Discretionary,
        "FamilyResponsibility" => LeaveType.FamilyResponsibility,
        _                      => LeaveType.Other
    };

    private static LeaveRecordDto ToDto(LeaveRecord l) => new()
    {
        Id = l.Id,
        TeamMemberId = l.TeamMemberId,
        MemberName = $"{l.TeamMember.FirstName} {l.TeamMember.LastName}",
        StartDate = l.StartDate,
        EndDate = l.EndDate,
        Type = l.Type.ToString(),
        DaysCount = l.DaysCount,
        Notes = l.Notes
    };
}
