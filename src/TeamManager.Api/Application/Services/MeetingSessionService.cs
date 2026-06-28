using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.MeetingSession;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class MeetingSessionService(AppDbContext db) : IMeetingSessionService
{
    public async Task<IReadOnlyList<MeetingSessionDto>> GetAllAsync()
    {
        var sessions = await db.Set<MeetingSession>()
            .Include(s => s.CreatedBy)
            .Include(s => s.Slots).ThenInclude(sl => sl.TeamMember)
            .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .OrderByDescending(s => s.Date)
            .ThenByDescending(s => s.StartTime)
            .ToListAsync();

        return sessions.Select(ToDto).ToList();
    }

    public async Task<MeetingSessionDto?> GetByIdAsync(Guid id)
    {
        var session = await db.Set<MeetingSession>()
            .Include(s => s.CreatedBy)
            .Include(s => s.Slots).ThenInclude(sl => sl.TeamMember)
            .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .FirstOrDefaultAsync(s => s.Id == id);

        return session is null ? null : ToDto(session);
    }

    public async Task<MeetingSessionDto> CreateAsync(CreateSessionRequest request, Guid createdByMemberId)
    {
        var location = Enum.Parse<MeetingLocation>(request.Location);
        var meetingType = Enum.Parse<MeetingType>(request.Type);

        var slots = request.Slots.Select(s => new MeetingSlot
        {
            Date = DateOnly.Parse(s.Date),
            StartTime = TimeSpan.Parse(s.StartTime),
            EndTime = TimeSpan.Parse(s.EndTime),
            Type = Enum.Parse<SlotType>(s.SlotType),
            LocationId = s.LocationId,
            TeamMemberId = s.TeamMemberId
        }).ToList();

        if (slots.Count == 0)
            throw new InvalidOperationException("At least one slot is required.");

        var session = new MeetingSession
        {
            Title = request.Title,
            Description = request.Description,
            Date = slots.Min(s => s.Date!.Value),
            StartTime = slots.Min(s => s.StartTime!.Value),
            EndTime = slots.Max(s => s.EndTime!.Value),
            Location = location,
            Type = meetingType,
            Status = MeetingStatus.Open,
            CreatedByMemberId = createdByMemberId,
            Slots = slots
        };

        if (slots.All(s => s.TeamMemberId.HasValue))
            session.Status = MeetingStatus.Filled;

        db.Set<MeetingSession>().Add(session);
        await db.SaveChangesAsync();

        return (await GetByIdAsync(session.Id))!;
    }

    public async Task<MeetingSessionDto?> UpdateAsync(Guid id, UpdateSessionRequest request)
    {
        var session = await db.Set<MeetingSession>().FindAsync(id);
        if (session is null) return null;

        var location = Enum.Parse<MeetingLocation>(request.Location);
        var startTime = TimeSpan.Parse(request.StartTime);
        var endTime = TimeSpan.Parse(request.EndTime);

        session.Title = request.Title;
        session.Description = request.Description;
        session.Date = request.Date;
        session.StartTime = startTime;
        session.EndTime = endTime;
        session.Location = location;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var session = await db.Set<MeetingSession>()
            .Include(s => s.Slots)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (session is null) return false;

        db.Set<MeetingSession>().Remove(session);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<MeetingSessionDto?> UpdateStatusAsync(Guid id, string status)
    {
        var session = await db.Set<MeetingSession>().FindAsync(id);
        if (session is null) return null;

        session.Status = Enum.Parse<MeetingStatus>(status);
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<MeetingSessionDto?> BookSlotAsync(Guid sessionId, Guid slotId, Guid memberId, BookSlotRequest request)
    {
        var session = await db.Set<MeetingSession>()
            .Include(s => s.Slots).ThenInclude(sl => sl.TeamMember)
    .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;
        if (session.Status == MeetingStatus.Cancelled) return null;

        var slot = session.Slots.FirstOrDefault(sl => sl.Id == slotId);
        if (slot is null) return null;
        if (slot.TeamMemberId.HasValue) return null;

        var alreadyBooked = session.Slots.Any(sl => sl.TeamMemberId == memberId);
        if (alreadyBooked) return null;

        slot.TeamMemberId = memberId;
        slot.Notes = request.Notes;
        slot.BookedAt = DateTimeOffset.UtcNow;

        if (session.Slots.All(sl => sl.TeamMemberId.HasValue))
        {
            session.Status = MeetingStatus.Filled;
        }

        await db.SaveChangesAsync();
        return await GetByIdAsync(sessionId);
    }

    public async Task<MeetingSessionDto?> UnbookSlotAsync(Guid sessionId, Guid slotId)
    {
        var session = await db.Set<MeetingSession>()
            .Include(s => s.Slots).ThenInclude(sl => sl.TeamMember)
    .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;

        var slot = session.Slots.FirstOrDefault(sl => sl.Id == slotId);
        if (slot is null) return null;
        if (!slot.TeamMemberId.HasValue) return null;

        slot.TeamMemberId = null;
        slot.Notes = null;
        slot.BookedAt = null;

        if (session.Status == MeetingStatus.Filled)
        {
            session.Status = MeetingStatus.Open;
        }

        await db.SaveChangesAsync();
        return await GetByIdAsync(sessionId);
    }

    internal static MeetingSessionDto ToDto(MeetingSession s) => new()
    {
        Id = s.Id,
        Title = s.Title,
        Description = s.Description,
        Date = s.Date,
        StartTime = s.StartTime.ToString(@"hh\:mm"),
        EndTime = s.EndTime.ToString(@"hh\:mm"),
        Location = s.Location.ToString(),
        Type = s.Type.ToString(),
        Status = s.Status.ToString(),
        CreatedByMemberId = s.CreatedByMemberId,
        CreatedByMemberName = $"{s.CreatedBy.FirstName} {s.CreatedBy.LastName}",
        CreatedAt = s.CreatedAt,
        Slots = s.Slots.Select(sl => new MeetingSlotDto
        {
            Id = sl.Id,
            MeetingSessionId = sl.MeetingSessionId,
            TeamMemberId = sl.TeamMemberId,
            TeamMemberName = sl.TeamMember is not null
                ? $"{sl.TeamMember.FirstName} {sl.TeamMember.LastName}"
                : null,
            LocationId = sl.LocationId,
            LocationName = sl.Location?.Name,
            LocationColor = sl.Location?.Color,
            Notes = sl.Notes,
            SlotType = sl.Type.ToString(),
            Date = sl.Date?.ToString("yyyy-MM-dd"),
            StartTime = sl.StartTime?.ToString(@"hh\:mm"),
            EndTime = sl.EndTime?.ToString(@"hh\:mm"),
            BookedAt = sl.BookedAt
        }).ToList()
    };
}
