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
            .FirstOrDefaultAsync(s => s.Id == id);

        return session is null ? null : ToDto(session);
    }

    public async Task<MeetingSessionDto> CreateAsync(CreateSessionRequest request, Guid createdByMemberId)
    {
        var location = Enum.Parse<MeetingLocation>(request.Location);
        var startTime = TimeSpan.Parse(request.StartTime);
        var endTime = TimeSpan.Parse(request.EndTime);

        var session = new MeetingSession
        {
            Title = request.Title,
            Description = request.Description,
            Date = request.Date,
            StartTime = startTime,
            EndTime = endTime,
            Location = location,
            Status = MeetingStatus.Open,
            CreatedByMemberId = createdByMemberId
        };

        // Create team member slots
        for (int i = 0; i < request.TeamMemberSlotCount; i++)
        {
            session.Slots.Add(new MeetingSlot
            {
                Type = SlotType.TeamMember
            });
        }

        // Create facilitator slots
        for (int i = 0; i < request.FacilitatorSlotCount; i++)
        {
            session.Slots.Add(new MeetingSlot
            {
                Type = SlotType.Facilitator
            });
        }

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
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;
        if (session.Status == MeetingStatus.Cancelled) return null;

        var slot = session.Slots.FirstOrDefault(sl => sl.Id == slotId);
        if (slot is null) return null;
        if (slot.TeamMemberId.HasValue) return null; // Already booked

        // Check member hasn't already booked another slot in this session
        var alreadyBooked = session.Slots.Any(sl => sl.TeamMemberId == memberId);
        if (alreadyBooked) return null;

        slot.TeamMemberId = memberId;
        slot.Notes = request.Notes;
        slot.BookedAt = DateTimeOffset.UtcNow;

        // Update session status if all slots are filled
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
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;

        var slot = session.Slots.FirstOrDefault(sl => sl.Id == slotId);
        if (slot is null) return null;
        if (!slot.TeamMemberId.HasValue) return null; // Not booked

        slot.TeamMemberId = null;
        slot.Notes = null;
        slot.BookedAt = null;

        // Revert status to Open if it was Filled
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
            Notes = sl.Notes,
            SlotType = sl.Type.ToString(),
            BookedAt = sl.BookedAt
        }).ToList()
    };
}
