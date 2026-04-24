using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.LeaveRecord;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class LeaveService(AppDbContext db, IHttpClientFactory httpClientFactory) : ILeaveService
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
            .Select(l => new { l.TeamMemberId, l.StartDate, l.Type })
            .ToListAsync();

        var existingSet = existing
            .Select(e => $"{e.TeamMemberId}|{e.StartDate}|{e.Type}")
            .ToHashSet();

        var unknownNames = new HashSet<string>();
        var toInsert = new List<LeaveRecord>();

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

            if (existingSet.Contains(key)) continue;

            toInsert.Add(new LeaveRecord
            {
                TeamMemberId = memberId,
                StartDate = startDate,
                EndDate = DateOnly.FromDateTime(DateTime.Parse(r.End).AddDays(-1)),
                Type = leaveType,
                DaysCount = decimal.TryParse(r.TotalDays, out var d) ? d : 1,
                Notes = $"Imported ({r.Status})"
            });

            existingSet.Add(key);
        }

        db.LeaveRecords.AddRange(toInsert);
        await db.SaveChangesAsync();

        var duplicates = request.Records.Count - unknownNames
            .Select(n => request.Records.Count(r => ExtractName(r.Title).Equals(n, StringComparison.OrdinalIgnoreCase)))
            .Sum() - toInsert.Count;

        return new ImportLeaveResult(toInsert.Count, Math.Max(0, duplicates), unknownNames.ToList());
    }

    public async Task<ImportLeaveResult> FetchAndImportAsync(FetchLeaveRequest request)
    {
        var client = httpClientFactory.CreateClient("entelect");
        var cookieValue = request.Cookie.TrimStart();
        var cookieHeader = cookieValue.StartsWith(".AspNet.Cookies=") ? cookieValue : $".AspNet.Cookies={cookieValue}";
        client.DefaultRequestHeaders.Add("Cookie", cookieHeader);
        client.DefaultRequestHeaders.Add("Accept", "application/json, text/javascript, */*; q=0.01");
        client.DefaultRequestHeaders.Add("X-Requested-With", "XMLHttpRequest");

        var formParts = request.TeamIds.Select(id => $"teamId={id}").ToList();
        formParts.Add($"start={request.Start}");
        formParts.Add($"end={request.End}");
        var body = new StringContent(string.Join("&", formParts));
        body.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

        var response = await client.PostAsync(
            "https://employee.entelect.co.za/LeaveCalendar/GetLeaveCalenderEvents", body);

        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Entelect returned {(int)response.StatusCode}. Your session cookie may have expired.");

        if (!json.TrimStart().StartsWith('['))
            throw new InvalidOperationException("Entelect did not return JSON data. Your session cookie may have expired or is invalid.");

        var records = JsonSerializer.Deserialize<List<JsonElement>>(json) ?? [];

        var importRecords = records.Select(r => new ImportLeaveRecord(
            r.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "",
            r.TryGetProperty("start", out var s) ? s.GetString() ?? "" : "",
            r.TryGetProperty("end", out var e) ? e.GetString() ?? "" : "",
            r.TryGetProperty("type", out var ty) ? ty.GetString() ?? "Other" : "Other",
            r.TryGetProperty("totalDays", out var d) ? d.GetString() ?? "1" : "1",
            r.TryGetProperty("status", out var st) ? st.GetString() ?? "" : ""
        )).ToList();

        return await ImportAsync(new ImportLeaveRequest(importRecords));
    }

    private static string ExtractName(string title) =>
        title.Split(" - ")[0].Trim();

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
