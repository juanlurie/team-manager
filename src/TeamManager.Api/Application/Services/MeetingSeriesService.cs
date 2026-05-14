using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.MeetingSeries;
using TeamManager.Api.Application.DTOs.MeetingSeriesItem;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemParticipant;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class MeetingSeriesService(AppDbContext db) : IMeetingSeriesService
{
    public async Task<IReadOnlyList<MeetingSeriesDto>> GetAllAsync()
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.CreatedBy)
            .Include(s => s.Slots)
            .Include(s => s.Items)
                .ThenInclude(i => i.Participants)
                    .ThenInclude(p => p.TeamMember)
            .Include(s => s.Items)
                .ThenInclude(i => i.Availabilities)
                    .ThenInclude(a => a.MeetingSeriesSlot)
                        .ThenInclude(s => s.Location)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return series.Select(ToDto).ToList();
    }

    public async Task<MeetingSeriesDto?> GetByIdAsync(Guid id)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.CreatedBy)
            .Include(s => s.Slots)
            .Include(s => s.Items)
                .ThenInclude(i => i.Participants)
                    .ThenInclude(p => p.TeamMember)
            .Include(s => s.Items)
                .ThenInclude(i => i.Availabilities)
                    .ThenInclude(a => a.MeetingSeriesSlot)
                        .ThenInclude(s => s.Location)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (series is null) return null;
        return ToDto(series);
    }

    public async Task<MeetingSeriesDto> CreateAsync(CreateMeetingSeriesRequest request, Guid createdByMemberId)
    {
        var series = new MeetingSeries
        {
            Title = request.Title,
            Description = request.Description,
            CreatedByMemberId = createdByMemberId,
            IsActive = request.IsActive,
            Slots = request.Slots.Select(s => new MeetingSeriesSlot
            {
                Date = DateOnly.Parse(s.Date),
                StartTime = TimeSpan.Parse(s.StartTime),
                EndTime = TimeSpan.Parse(s.EndTime),
                LocationId = s.LocationId,
                SortOrder = s.SortOrder
            }).ToList()
        };

        db.Set<MeetingSeries>().Add(series);
        await db.SaveChangesAsync();

        return (await GetByIdAsync(series.Id))!;
    }

    public async Task<MeetingSeriesDto?> UpdateAsync(Guid id, UpdateMeetingSeriesRequest request)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (series is null) return null;

        series.Title = request.Title;
        series.Description = request.Description;
        series.IsActive = request.IsActive;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.Slots)
            .Include(s => s.Items)
                .ThenInclude(i => i.Participants)
            .Include(s => s.Items)
                .ThenInclude(i => i.Availabilities)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (series is null) return false;

        db.Set<MeetingSeries>().Remove(series);
        await db.SaveChangesAsync();
        return true;
    }

    // Slots
    public async Task<IReadOnlyList<MeetingSeriesSlotDto>> GetSeriesSlotsAsync(Guid seriesId)
    {
        var slots = await db.Set<MeetingSeriesSlot>()
            .Where(s => s.MeetingSeriesId == seriesId)
            .Include(s => s.Location)
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Date)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        return slots.Select(ToDto).ToList();
    }

    public async Task<MeetingSeriesDto?> CreateSeriesSlotsAsync(Guid seriesId, CreateMeetingSeriesSlotsRequest request)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.Id == seriesId);
        if (series is null) return null;

        var slots = request.Slots.Select(s => new MeetingSeriesSlot
        {
            MeetingSeriesId = seriesId,
            Date = DateOnly.Parse(s.Date),
            StartTime = TimeSpan.Parse(s.StartTime),
            EndTime = TimeSpan.Parse(s.EndTime),
            LocationId = s.LocationId,
            SortOrder = s.SortOrder
        }).ToList();

        db.Set<MeetingSeriesSlot>().AddRange(slots);
        await db.SaveChangesAsync();

        return await GetByIdAsync(seriesId);
    }

    public async Task<MeetingSeriesDto?> UpdateSeriesSlotAsync(Guid seriesId, Guid slotId, UpdateMeetingSeriesSlotRequest request)
    {
        var slot = await db.Set<MeetingSeriesSlot>()
            .Include(s => s.Location)
            .FirstOrDefaultAsync(s => s.Id == slotId && s.MeetingSeriesId == seriesId);
        if (slot is null) return null;

        slot.Date = DateOnly.Parse(request.Date);
        slot.StartTime = TimeSpan.Parse(request.StartTime);
        slot.EndTime = TimeSpan.Parse(request.EndTime);
        slot.LocationId = request.LocationId;
        slot.SortOrder = request.SortOrder;

        await db.SaveChangesAsync();
        return await GetByIdAsync(seriesId);
    }

    public async Task<bool> DeleteSeriesSlotAsync(Guid seriesId, Guid slotId)
    {
        var slot = await db.Set<MeetingSeriesSlot>()
            .FirstOrDefaultAsync(s => s.Id == slotId && s.MeetingSeriesId == seriesId);
        if (slot is null) return false;

        db.Set<MeetingSeriesSlot>().Remove(slot);
        await db.SaveChangesAsync();
        return true;
    }

    // Items
    public async Task<IReadOnlyList<MeetingSeriesItemDto>> GetSeriesItemsAsync(Guid seriesId)
    {
        var items = await db.Set<MeetingSeriesItem>()
            .Where(i => i.MeetingSeriesId == seriesId)
            .Include(i => i.Participants)
                .ThenInclude(p => p.TeamMember)
            .Include(i => i.Availabilities)
                .ThenInclude(a => a.MeetingSeriesSlot)
                    .ThenInclude(s => s.Location)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();

        return items.Select(ToDto).ToList();
    }

    public async Task<MeetingSeriesDto?> CreateSeriesItemAsync(Guid seriesId, CreateMeetingSeriesItemRequest request)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.CreatedBy)
            .FirstOrDefaultAsync(s => s.Id == seriesId);
        if (series is null) return null;

        var item = new MeetingSeriesItem
        {
            MeetingSeriesId = seriesId,
            Title = request.Title,
            Description = request.Description,
            DurationMinutes = request.DurationMinutes,
            Participants = request.Participants.Select(p => new MeetingSeriesItemParticipant
            {
                TeamMemberId = p.TeamMemberId,
                Role = p.Role
            }).ToList()
        };

        db.Set<MeetingSeriesItem>().Add(item);
        await db.SaveChangesAsync();

        return await GetByIdAsync(seriesId);
    }

    public async Task<MeetingSeriesDto?> UpdateSeriesItemAsync(Guid seriesId, Guid itemId, UpdateMeetingSeriesItemRequest request)
    {
        var item = await db.Set<MeetingSeriesItem>()
            .Include(i => i.Participants)
                .ThenInclude(p => p.TeamMember)
            .Include(i => i.Availabilities)
                .ThenInclude(a => a.MeetingSeriesSlot)
                    .ThenInclude(s => s.Location)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.MeetingSeriesId == seriesId);
        if (item is null) return null;

        item.Title = request.Title;
        item.Description = request.Description;
        item.DurationMinutes = request.DurationMinutes;

        // Update participants: remove existing and add new
        db.Set<MeetingSeriesItemParticipant>().RemoveRange(item.Participants);
        item.Participants = request.Participants.Select(p => new MeetingSeriesItemParticipant
        {
            MeetingSeriesItemId = itemId,
            TeamMemberId = p.TeamMemberId,
            Role = p.Role
        }).ToList();

        await db.SaveChangesAsync();
        return await GetByIdAsync(seriesId);
    }

    public async Task<bool> DeleteSeriesItemAsync(Guid seriesId, Guid itemId)
    {
        var item = await db.Set<MeetingSeriesItem>()
            .Include(i => i.Participants)
            .Include(i => i.Availabilities)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.MeetingSeriesId == seriesId);
        if (item is null) return false;

        db.Set<MeetingSeriesItem>().Remove(item);
        await db.SaveChangesAsync();
        return true;
    }

    // Availability
    public async Task<IReadOnlyList<MeetingSeriesItemAvailabilityDto>> GetItemAvailabilitiesAsync(Guid itemId)
    {
        var availabilities = await db.Set<MeetingSeriesItemAvailability>()
            .Where(a => a.MeetingSeriesItemId == itemId)
            .Include(a => a.MeetingSeriesSlot)
                .ThenInclude(s => s.Location)
            .Include(a => a.TeamMember)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

        return availabilities.Select(ToDto).ToList();
    }

    public async Task<MeetingSeriesDto?> AddItemAvailabilityAsync(Guid itemId, AddMeetingSeriesItemAvailabilityRequest request)
    {
        var item = await db.Set<MeetingSeriesItem>()
            .Include(i => i.Participants)
                .ThenInclude(p => p.TeamMember)
            .Include(i => i.Availabilities)
                .ThenInclude(a => a.MeetingSeriesSlot)
                    .ThenInclude(s => s.Location)
            .FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null) return null;

        // Check if availability already exists for this item, slot, and team member
        var exists = await db.Set<MeetingSeriesItemAvailability>()
            .AnyAsync(a => a.MeetingSeriesItemId == itemId &&
                           a.MeetingSeriesSlotId == request.MeetingSeriesSlotId &&
                           a.TeamMemberId == request.TeamMemberId);
        if (exists)
        {
            // Return the current state without adding duplicate
            return await GetByIdAsync(item.MeetingSeriesId);
        }

        var availability = new MeetingSeriesItemAvailability
        {
            MeetingSeriesItemId = itemId,
            MeetingSeriesSlotId = request.MeetingSeriesSlotId,
            TeamMemberId = request.TeamMemberId,
            Notes = request.Notes
        };

        db.Set<MeetingSeriesItemAvailability>().Add(availability);
        await db.SaveChangesAsync();

        // After adding availability, check if this confirms the item and create MeetingSession if needed
        await CheckAndConfirmItemAsync(itemId);

        return await GetByIdAsync(item.MeetingSeriesId);
    }

    public async Task<MeetingSeriesDto?> RemoveItemAvailabilityAsync(Guid itemId, Guid availabilityId)
    {
        var availability = await db.Set<MeetingSeriesItemAvailability>()
            .Include(a => a.MeetingSeriesItem)
                .ThenInclude(i => i.MeetingSeries)
            .Include(a => a.MeetingSeriesSlot)
                .ThenInclude(s => s.Location)
            .Include(a => a.TeamMember)
            .FirstOrDefaultAsync(a => a.Id == availabilityId && a.MeetingSeriesItemId == itemId);
        if (availability is null) return null;

        var meetingSeriesId = availability.MeetingSeriesItem.MeetingSeriesId;

        db.Set<MeetingSeriesItemAvailability>().Remove(availability);
        await db.SaveChangesAsync();

        // After removing availability, check if this unconfirms the item and delete MeetingSession if needed
        await CheckAndUnconfirmItemAsync(itemId);

        return await GetByIdAsync(meetingSeriesId);
    }

    private async Task CheckAndConfirmItemAsync(Guid itemId)
    {
        var item = await db.Set<MeetingSeriesItem>()
            .Include(i => i.Participants)
                .ThenInclude(p => p.TeamMember)
            .Include(i => i.Availabilities)
                .ThenInclude(a => a.MeetingSeriesSlot)
                    .ThenInclude(s => s.Location)
            .FirstOrDefaultAsync(i => i.Id == itemId);

        if (item is null) return;

        // Get mandatory participant IDs
        var mandatoryParticipantIds = item.Participants
            .Where(p => p.Role.ToLowerInvariant() == "mandatory")
            .Select(p => p.TeamMemberId)
            .ToHashSet();

        if (mandatoryParticipantIds.Count == 0)
        {
            // No mandatory participants, cannot be confirmed
            return;
        }

        // Group availabilities by slot
        var availabilitiesBySlot = item.Availabilities
            .GroupBy(a => a.MeetingSeriesSlotId)
            .ToDictionary(g => g.Key, g => g.Select(a => a.TeamMemberId).ToHashSet());

        // Find a slot where all mandatory participants have availability
        foreach (var slot in item.Availabilities.Select(a => a.MeetingSeriesSlot).Distinct())
        {
            if (slot is null) continue;
            var attendeeIds = availabilitiesBySlot.GetValueOrDefault(slot.Id, new HashSet<Guid>());
            if (mandatoryParticipantIds.IsSubsetOf(attendeeIds))
            {
                // Confirm the item with this slot
                item.IsConfirmed = true;
                item.ConfirmedSlotId = slot.Id;

                // Create a MeetingSession from this confirmed item
                await CreateMeetingSessionFromItemAsync(item, slot);
                break;
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task CheckAndUnconfirmItemAsync(Guid itemId)
    {
        var item = await db.Set<MeetingSeriesItem>()
            .Include(i => i.Participants)
                .ThenInclude(p => p.TeamMember)
            .Include(i => i.Availabilities)
                .ThenInclude(a => a.MeetingSeriesSlot)
                    .ThenInclude(s => s.Location)
            .FirstOrDefaultAsync(i => i.Id == itemId);

        if (item is null) return;

        // If the item was confirmed, check if it should be unconfirmed
        if (item.IsConfirmed && item.ConfirmedSlotId.HasValue)
        {
            var mandatoryParticipantIds = item.Participants
                .Where(p => p.Role.ToLowerInvariant() == "mandatory")
                .Select(p => p.TeamMemberId)
                .ToHashSet();

            var availabilitiesBySlot = item.Availabilities
                .GroupBy(a => a.MeetingSeriesSlotId)
                .ToDictionary(g => g.Key, g => g.Select(a => a.TeamMemberId).ToHashSet());

            var slot = await db.Set<MeetingSeriesSlot>()
                .FirstOrDefaultAsync(s => s.Id == item.ConfirmedSlotId.Value);

            if (slot is not null)
            {
                var attendeeIds = availabilitiesBySlot.GetValueOrDefault(slot.Id, new HashSet<Guid>());
                if (!mandatoryParticipantIds.IsSubsetOf(attendeeIds))
                {
                    // Unconfirm the item
                    item.IsConfirmed = false;
                    item.ConfirmedSlotId = null;

                    // Delete the associated MeetingSession if it exists
                    var meetingSession = await db.Set<MeetingSession>()
                        .FirstOrDefaultAsync(ms => ms.MeetingSeriesItemId == item.Id);
                    if (meetingSession is not null)
                    {
                        db.Set<MeetingSession>().Remove(meetingSession);
                    }
                }
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task CreateMeetingSessionFromItemAsync(MeetingSeriesItem item, MeetingSeriesSlot slot)
    {
        // Check if a MeetingSession already exists for this item (shouldn't happen if we manage correctly)
        var existingSession = await db.Set<MeetingSession>()
            .FirstOrDefaultAsync(ms => ms.Title == item.Title && 
                                       ms.Date == slot.Date && 
                                       ms.StartTime == slot.StartTime && 
                                       ms.EndTime == slot.EndTime);

        if (existingSession is not null)
        {
            // Update the existing session to link to this item
            existingSession.MeetingSeriesItemId = item.Id;
            existingSession.MeetingSeriesSlotId = slot.Id;
        }
        else
        {
            // Create a new MeetingSession
            var meetingSession = new MeetingSession
            {
                Title = item.Title,
                Description = item.Description,
                Date = slot.Date,
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                Location = ResolveMeetingLocation(slot.Location),
                Type = MeetingType.Discussion, // Default type, could be configurable
                Status = MeetingStatus.Filled, // Since all mandatory participants are available
                CreatedByMemberId = item.MeetingSeries.CreatedByMemberId,
                MeetingSeriesItemId = item.Id,
                MeetingSeriesSlotId = slot.Id,
                Slots = item.Participants.Select(p => new MeetingSlot
                {
                    TeamMemberId = p.TeamMemberId,
                    Type = SlotType.TeamMember,
                    Date = slot.Date,
                    StartTime = slot.StartTime,
                    EndTime = slot.EndTime,
                    LocationId = slot.LocationId
                }).ToList()
            };

            db.Set<MeetingSession>().Add(meetingSession);
        }

        // Note: We don't call SaveChanges here; it will be done by the caller
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

    // DTO conversion methods
    internal static MeetingSeriesDto ToDto(MeetingSeries s) => new()
    {
        Id = s.Id,
        Title = s.Title,
        Description = s.Description,
        CreatedByMemberId = s.CreatedByMemberId,
        CreatedByMemberName = $"{s.CreatedBy.FirstName} {s.CreatedBy.LastName}",
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt,
        Slots = s.Slots.Select(sl => new MeetingSeriesSlotDto
        {
            Id = sl.Id,
            Date = sl.Date,
            StartTime = sl.StartTime,
            EndTime = sl.EndTime,
            LocationId = sl.LocationId,
            LocationName = sl.Location?.Name,
            LocationColor = sl.Location?.Color,
            SortOrder = sl.SortOrder
        }).ToList(),
        Items = s.Items.Select(i => new MeetingSeriesItemDto
        {
            Id = i.Id,
            Title = i.Title,
            Description = i.Description,
            DurationMinutes = i.DurationMinutes,
            ConfirmedSlotId = i.ConfirmedSlotId,
            IsConfirmed = i.IsConfirmed,
            CreatedAt = i.CreatedAt,
            Participants = i.Participants.Select(p => new MeetingSeriesItemParticipantDto
            {
                Id = p.Id,
                TeamMemberId = p.TeamMemberId,
                TeamMemberName = $"{p.TeamMember.FirstName} {p.TeamMember.LastName}",
                Role = p.Role
            }).ToList(),
            Availabilities = i.Availabilities.Select(a => new MeetingSeriesItemAvailabilityDto
            {
                Id = a.Id,
                MeetingSeriesItemId = a.MeetingSeriesItemId,
                MeetingSeriesSlotId = a.MeetingSeriesSlotId,
                TeamMemberId = a.TeamMemberId,
                TeamMemberName = $"{a.TeamMember.FirstName} {a.TeamMember.LastName}",
                Notes = a.Notes,
                CreatedAt = a.CreatedAt
            }).ToList()
        }).ToList()
    };

    internal static MeetingSeriesSlotDto ToDto(MeetingSeriesSlot s) => new()
    {
        Id = s.Id,
        Date = s.Date,
        StartTime = s.StartTime,
        EndTime = s.EndTime,
        LocationId = s.LocationId,
        LocationName = s.Location?.Name,
        LocationColor = s.Location?.Color,
        SortOrder = s.SortOrder
    };

    internal static MeetingSeriesItemDto ToDto(MeetingSeriesItem i) => new()
    {
        Id = i.Id,
        Title = i.Title,
        Description = i.Description,
        DurationMinutes = i.DurationMinutes,
        ConfirmedSlotId = i.ConfirmedSlotId,
        IsConfirmed = i.IsConfirmed,
        CreatedAt = i.CreatedAt,
        Participants = i.Participants.Select(p => new MeetingSeriesItemParticipantDto
        {
            Id = p.Id,
            TeamMemberId = p.TeamMemberId,
            TeamMemberName = $"{p.TeamMember.FirstName} {p.TeamMember.LastName}",
            Role = p.Role
        }).ToList(),
        Availabilities = i.Availabilities.Select(a => new MeetingSeriesItemAvailabilityDto
        {
            Id = a.Id,
            MeetingSeriesItemId = a.MeetingSeriesItemId,
            MeetingSeriesSlotId = a.MeetingSeriesSlotId,
            TeamMemberId = a.TeamMemberId,
            TeamMemberName = $"{a.TeamMember.FirstName} {a.TeamMember.LastName}",
            Notes = a.Notes,
            CreatedAt = a.CreatedAt
        }).ToList()
    };

    internal static MeetingSeriesItemParticipantDto ToDto(MeetingSeriesItemParticipant p) => new()
    {
        Id = p.Id,
        TeamMemberId = p.TeamMemberId,
        TeamMemberName = $"{p.TeamMember.FirstName} {p.TeamMember.LastName}",
        Role = p.Role
    };

    internal static MeetingSeriesItemAvailabilityDto ToDto(MeetingSeriesItemAvailability a) => new()
    {
        Id = a.Id,
        MeetingSeriesItemId = a.MeetingSeriesItemId,
        MeetingSeriesSlotId = a.MeetingSeriesSlotId,
        TeamMemberId = a.TeamMemberId,
        TeamMemberName = $"{a.TeamMember.FirstName} {a.TeamMember.LastName}",
        Notes = a.Notes,
        CreatedAt = a.CreatedAt
    };
}