using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.SessionDefinition;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class SessionDefinitionService(AppDbContext db) : ISessionDefinitionService
{
    public async Task<IReadOnlyList<SessionDefinitionDto>> GetAllAsync()
    {
        var items = await db.Set<SessionDefinition>()
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants).ThenInclude(p => p.TeamMember)
            .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings).ThenInclude(b => b.TeamMember)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var dtos = items.Select(ToDto).ToList();
        await PopulateConnectedMeetingsAsync(dtos);
        return dtos;
    }

    public async Task<SessionDefinitionDto?> GetByIdAsync(Guid id)
    {
        var item = await db.Set<SessionDefinition>()
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants).ThenInclude(p => p.TeamMember)
            .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings).ThenInclude(b => b.TeamMember)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (item is null) return null;
        var dto = ToDto(item);
        return await PopulateConnectedMeetingsAsync(dto);
    }

    public async Task<SessionDefinitionDto> CreateAsync(CreateSessionDefinitionRequest request, Guid createdByMemberId)
    {
        var item = new SessionDefinition
        {
            Name = request.Name,
            Description = request.Description,
            CreatedByMemberId = createdByMemberId,
            Participants = request.Participants.Select(p => new SessionDefinitionParticipant
            {
                TeamMemberId = p.TeamMemberId,
                Role = Enum.Parse<ParticipantRole>(p.Role)
            }).ToList()
        };

        db.Set<SessionDefinition>().Add(item);
        await db.SaveChangesAsync();

        return (await GetByIdAsync(item.Id))!;
    }

    public async Task<SessionDefinitionDto?> UpdateAsync(Guid id, UpdateSessionDefinitionRequest request)
    {
        var item = await db.Set<SessionDefinition>()
            .Include(s => s.Participants)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings)
            .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (item is null) return null;

        item.Name = request.Name;
        item.Description = request.Description;

        db.Set<SessionDefinitionParticipant>().RemoveRange(item.Participants);
        item.Participants = request.Participants.Select(p => new SessionDefinitionParticipant
        {
            SessionDefinitionId = id,
            TeamMemberId = p.TeamMemberId,
            Role = Enum.Parse<ParticipantRole>(p.Role)
        }).ToList();

        foreach (var slot in item.Slots)
        {
            var wasConfirmed = slot.IsConfirmed;
            UpdateSlotConfirmation(slot, item.Participants);
            if (wasConfirmed != slot.IsConfirmed)
                await SyncMeetingSession(slot, item);
        }

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var item = await db.Set<SessionDefinition>()
            .Include(s => s.Participants)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (item is null) return false;

        var slotIds = item.Slots.Select(s => s.Id).ToHashSet();
        var meetings = await db.Set<MeetingSession>()
            .Where(ms => ms.SessionDefinitionSlotId != null && slotIds.Contains(ms.SessionDefinitionSlotId!.Value))
            .ToListAsync();
        db.Set<MeetingSession>().RemoveRange(meetings);

        db.Set<SessionDefinition>().Remove(item);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<SessionDefinitionDto?> CreateSlotsAsync(Guid id, CreateSessionSlotsRequest request)
    {
        var item = await db.Set<SessionDefinition>()
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (item is null) return null;

        var slots = request.Slots.Select(s => new SessionDefinitionSlot
        {
            SessionDefinitionId = id,
            Date = DateOnly.Parse(s.Date),
            StartTime = TimeSpan.Parse(s.StartTime),
            EndTime = TimeSpan.Parse(s.EndTime),
            LocationId = s.LocationId,
            IsConfirmed = false
        }).ToList();

        db.Set<SessionDefinitionSlot>().AddRange(slots);
        await db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<SessionDefinitionDto?> UpdateSlotAsync(Guid id, Guid slotId, UpdateSessionSlotRequest request)
    {
        var slot = await db.Set<SessionDefinitionSlot>()
            .Include(s => s.Location)
            .FirstOrDefaultAsync(s => s.Id == slotId && s.SessionDefinitionId == id);

        if (slot is null) return null;

        slot.Date = DateOnly.Parse(request.Date);
        slot.StartTime = TimeSpan.Parse(request.StartTime);
        slot.EndTime = TimeSpan.Parse(request.EndTime);
        slot.LocationId = request.LocationId;

        if (slot.IsConfirmed)
        {
            var meeting = await db.Set<MeetingSession>()
                .Include(ms => ms.Slots)
                .FirstOrDefaultAsync(ms => ms.SessionDefinitionSlotId == slotId);
            if (meeting is not null)
            {
                meeting.Date = slot.Date;
                meeting.StartTime = slot.StartTime;
                meeting.EndTime = slot.EndTime;
                var location = slot.LocationId.HasValue
                    ? await db.Set<SlotLocation>().FindAsync(slot.LocationId.Value)
                    : null;
                meeting.Location = ResolveMeetingLocation(location);
                foreach (var ms in meeting.Slots)
                {
                    ms.Date = slot.Date;
                    ms.StartTime = slot.StartTime;
                    ms.EndTime = slot.EndTime;
                }
            }
        }

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteSlotAsync(Guid id, Guid slotId)
    {
        var slot = await db.Set<SessionDefinitionSlot>()
            .FirstOrDefaultAsync(s => s.Id == slotId && s.SessionDefinitionId == id);

        if (slot is null) return false;

        if (slot.IsConfirmed)
        {
            var meeting = await db.Set<MeetingSession>()
                .FirstOrDefaultAsync(ms => ms.SessionDefinitionSlotId == slotId);
            if (meeting is not null)
                db.Set<MeetingSession>().Remove(meeting);
        }

        db.Set<SessionDefinitionSlot>().Remove(slot);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<SessionDefinitionDto?> BookSlotAsync(Guid sessionId, Guid slotId, Guid memberId, BookSessionSlotRequest request)
    {
        var session = await db.Set<SessionDefinition>()
            .Include(s => s.Participants)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings)
            .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings).ThenInclude(b => b.TeamMember)
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants).ThenInclude(p => p.TeamMember)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;

        var slot = session.Slots.FirstOrDefault(sl => sl.Id == slotId);
        if (slot is null) return null;

        var alreadyBooked = slot.Bookings.Any(b => b.TeamMemberId == memberId);
        if (alreadyBooked) return null;

        var booking = new SessionDefinitionBooking
        {
            SessionDefinitionSlotId = slotId,
            TeamMemberId = memberId,
            Notes = request.Notes
        };

        db.Set<SessionDefinitionBooking>().Add(booking);
        await db.SaveChangesAsync();
        var wasConfirmed = slot.IsConfirmed;
        UpdateSlotConfirmation(slot, session.Participants);
        if (wasConfirmed != slot.IsConfirmed)
            await SyncMeetingSession(slot, session);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return null;
        }

        return await GetByIdAsync(sessionId);
    }

    public async Task<SessionDefinitionDto?> UnbookSlotAsync(Guid sessionId, Guid slotId, Guid memberId)
    {
        var session = await db.Set<SessionDefinition>()
            .Include(s => s.Participants)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings)
            .Include(s => s.Slots).ThenInclude(sl => sl.Location)
            .Include(s => s.Slots).ThenInclude(sl => sl.Bookings).ThenInclude(b => b.TeamMember)
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants).ThenInclude(p => p.TeamMember)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;

        var slot = session.Slots.FirstOrDefault(sl => sl.Id == slotId);
        if (slot is null) return null;

        var booking = slot.Bookings.FirstOrDefault(b => b.TeamMemberId == memberId);
        if (booking is null) return null;

        db.Set<SessionDefinitionBooking>().Remove(booking);
        var wasConfirmed = slot.IsConfirmed;
        UpdateSlotConfirmation(slot, session.Participants);
        if (wasConfirmed != slot.IsConfirmed)
            await SyncMeetingSession(slot, session);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return null;
        }

        return await GetByIdAsync(sessionId);
    }

    private static void UpdateSlotConfirmation(SessionDefinitionSlot slot, ICollection<SessionDefinitionParticipant> participants)
    {
        var mandatoryIds = participants
            .Where(p => p.Role == ParticipantRole.Mandatory)
            .Select(p => p.TeamMemberId)
            .ToHashSet();

        var bookedIds = slot.Bookings
            .Select(b => b.TeamMemberId)
            .ToHashSet();

        slot.IsConfirmed = mandatoryIds.Count > 0 && mandatoryIds.IsSubsetOf(bookedIds);
    }

    private async Task SyncMeetingSession(SessionDefinitionSlot slot, SessionDefinition session)
    {
        if (slot.IsConfirmed)
        {
            var existing = await db.Set<MeetingSession>()
                .Include(ms => ms.Slots)
                .FirstOrDefaultAsync(ms => ms.SessionDefinitionSlotId == slot.Id);
            if (existing is null)
            {
                var meeting = new MeetingSession
                {
                    Title = session.Name,
                    Description = session.Description,
                    Date = slot.Date,
                    StartTime = slot.StartTime,
                    EndTime = slot.EndTime,
                    Location = ResolveMeetingLocation(slot.Location),
                    Type = MeetingType.Discussion,
                    Status = MeetingStatus.Filled,
                    CreatedByMemberId = session.CreatedByMemberId,
                    SessionDefinitionSlotId = slot.Id,
                    SessionDefinitionId = slot.SessionDefinitionId,
                    Slots = slot.Bookings.Select(b => new MeetingSlot
                    {
                        TeamMemberId = b.TeamMemberId,
                        Notes = b.Notes,
                        Type = SlotType.TeamMember,
                        Date = slot.Date,
                        StartTime = slot.StartTime,
                        EndTime = slot.EndTime,
                        LocationId = slot.LocationId,
                        BookedAt = DateTimeOffset.UtcNow
                    }).ToList()
                };
                db.Set<MeetingSession>().Add(meeting);
            }
        }
        else
        {
            var existing = await db.Set<MeetingSession>()
                .FirstOrDefaultAsync(ms => ms.SessionDefinitionSlotId == slot.Id);
            if (existing is not null)
                db.Set<MeetingSession>().Remove(existing);
        }
    }

    private static MeetingLocation ResolveMeetingLocation(SlotLocation? location)
    {
        if (location is null || string.IsNullOrWhiteSpace(location.Name))
            return MeetingLocation.OnSite;

        var name = location.Name.ToLowerInvariant();
        if (name.Contains("remote")) return MeetingLocation.Remote;
        if (name.Contains("onsite") || name.Contains("on-site")) return MeetingLocation.OnSite;
        if (name.Contains("hybrid")) return MeetingLocation.Hybrid;
        return MeetingLocation.OnSite;
    }

    private async Task PopulateConnectedMeetingsAsync(List<SessionDefinitionDto> dtos)
    {
        var allSlotIds = dtos.SelectMany(d => d.Slots).Select(s => s.Id).ToHashSet();
        if (allSlotIds.Count == 0) return;

        var meetings = await db.Set<MeetingSession>()
            .Where(ms => ms.SessionDefinitionSlotId != null && allSlotIds.Contains(ms.SessionDefinitionSlotId!.Value))
            .ToListAsync();

        var meetingsBySlotId = meetings.ToDictionary(m => m.SessionDefinitionSlotId!.Value);

        for (var i = 0; i < dtos.Count; i++)
        {
            var dto = dtos[i];
            var newSlots = dto.Slots.Select(slot =>
            {
                if (meetingsBySlotId.TryGetValue(slot.Id, out var meeting))
                    return slot with
                    {
                        ConnectedMeetingSessionId = meeting.Id,
                        ConnectedMeetingSessionTitle = meeting.Title
                    };
                return slot;
            }).ToList();
            dtos[i] = dto with { Slots = newSlots };
        }
    }

    private async Task<SessionDefinitionDto> PopulateConnectedMeetingsAsync(SessionDefinitionDto dto)
    {
        var slotIds = dto.Slots.Select(s => s.Id).ToHashSet();
        if (slotIds.Count == 0) return dto;

        var meetings = await db.Set<MeetingSession>()
            .Where(ms => ms.SessionDefinitionSlotId != null && slotIds.Contains(ms.SessionDefinitionSlotId!.Value))
            .ToListAsync();

        var meetingsBySlotId = meetings.ToDictionary(m => m.SessionDefinitionSlotId!.Value);

        var newSlots = dto.Slots.Select(slot =>
        {
            if (meetingsBySlotId.TryGetValue(slot.Id, out var meeting))
                return slot with
                {
                    ConnectedMeetingSessionId = meeting.Id,
                    ConnectedMeetingSessionTitle = meeting.Title
                };
            return slot;
        }).ToList();

        return dto with { Slots = newSlots };
    }

    internal static SessionDefinitionDto ToDto(SessionDefinition s)
    {
        var mandatoryCount = s.Participants.Count(p => p.Role == ParticipantRole.Mandatory);

        return new SessionDefinitionDto
        {
            Id = s.Id,
            Name = s.Name,
            Description = s.Description,
            CreatedByMemberId = s.CreatedByMemberId,
            CreatedByMemberName = $"{s.CreatedBy.FirstName} {s.CreatedBy.LastName}",
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
            Participants = s.Participants.Select(p => new SessionDefinitionParticipantDto
            {
                Id = p.Id,
                TeamMemberId = p.TeamMemberId,
                TeamMemberName = $"{p.TeamMember.FirstName} {p.TeamMember.LastName}",
                Role = p.Role.ToString()
            }).ToList(),
            Slots = s.Slots.Select(sl => new SessionDefinitionSlotDto
            {
                Id = sl.Id,
                SessionDefinitionId = sl.SessionDefinitionId,
                Date = sl.Date.ToString("yyyy-MM-dd"),
                StartTime = sl.StartTime.ToString(@"hh\:mm"),
                EndTime = sl.EndTime.ToString(@"hh\:mm"),
                LocationId = sl.LocationId,
                LocationName = sl.Location?.Name,
                LocationColor = sl.Location?.Color,
                IsConfirmed = sl.IsConfirmed,
                BookingCount = sl.Bookings.Count,
                MandatoryCount = mandatoryCount,
                Bookings = sl.Bookings.Select(b => new SessionDefinitionBookingDto
                {
                    Id = b.Id,
                    SessionDefinitionSlotId = b.SessionDefinitionSlotId,
                    TeamMemberId = b.TeamMemberId,
                    TeamMemberName = $"{b.TeamMember.FirstName} {b.TeamMember.LastName}",
                    Notes = b.Notes,
                    BookedAt = b.BookedAt
                }).ToList()
            }).ToList()
        };
    }
}
