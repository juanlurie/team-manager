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

        var results = new List<MeetingSeriesDto>();
        foreach (var s in series)
        {
            results.Add(await MapSeriesWithClaimsAsync(s));
        }
        return results;
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
        return await MapSeriesWithClaimsAsync(series);
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

        var claims = await db.Set<MeetingSeriesSlotClaim>()
            .Where(c => c.MeetingSeriesId == seriesId)
            .ToListAsync();

        return slots.Select(sl => ToDtoWithClaim(sl, claims)).ToList();
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

        var claim = await db.Set<MeetingSeriesSlotClaim>()
            .FirstOrDefaultAsync(c => c.MeetingSeriesId == seriesId && c.MeetingSeriesSlotId == slotId);
        if (claim is not null)
        {
            throw new InvalidOperationException("Cannot delete a slot that is claimed by a confirmed item.");
        }

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

        if (item.IsConfirmed && item.ConfirmedSlotId.HasValue)
        {
            var claim = await db.Set<MeetingSeriesSlotClaim>()
                .FirstOrDefaultAsync(c => c.MeetingSeriesItemId == itemId);
            if (claim is not null)
            {
                db.Set<MeetingSeriesSlotClaim>().Remove(claim);
            }

            var session = await db.Set<MeetingSession>()
                .FirstOrDefaultAsync(ms => ms.MeetingSeriesItemId == itemId);
            if (session is not null)
            {
                db.Set<MeetingSession>().Remove(session);
            }
        }

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

        var exists = await db.Set<MeetingSeriesItemAvailability>()
            .AnyAsync(a => a.MeetingSeriesItemId == itemId &&
                           a.MeetingSeriesSlotId == request.MeetingSeriesSlotId &&
                           a.TeamMemberId == request.TeamMemberId);
        if (exists)
        {
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

        await CheckAndConfirmItemAsync(itemId, request.TeamMemberId);
        await db.SaveChangesAsync();

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

        await CheckAndUnconfirmItemAsync(itemId);
        await db.SaveChangesAsync();

        return await GetByIdAsync(meetingSeriesId);
    }

    // Bulk Availability
    public async Task<BulkAvailabilityResponse> GetBulkAvailabilityAsync(Guid seriesId, Guid memberId)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.Slots)
                .ThenInclude(sl => sl.Location)
            .Include(s => s.Items)
                .ThenInclude(i => i.Participants)
            .Include(s => s.Items)
                .ThenInclude(i => i.Availabilities)
            .FirstOrDefaultAsync(s => s.Id == seriesId);

        if (series is null)
            throw new KeyNotFoundException($"Series {seriesId} not found.");

        var member = await db.Set<TeamMember>()
            .FirstOrDefaultAsync(m => m.Id == memberId);

        if (member is null)
            throw new KeyNotFoundException($"Member {memberId} not found.");

        var claims = await db.Set<MeetingSeriesSlotClaim>()
            .Where(c => c.MeetingSeriesId == seriesId)
            .ToListAsync();

        var items = series.Items
            .Where(i => i.Participants.Any(p => p.TeamMemberId == memberId) && !i.IsConfirmed)
            .Select(i => new BulkAvailabilityItemDto
            {
                ItemId = i.Id,
                ItemTitle = i.Title,
                IsConfirmed = i.IsConfirmed,
                AvailableSlotIds = i.Availabilities
                    .Where(a => a.TeamMemberId == memberId)
                    .Select(a => a.MeetingSeriesSlotId)
                    .ToList()
            })
            .ToList();

        var slots = series.Slots
            .OrderBy(s => s.Date)
            .ThenBy(s => s.StartTime)
            .Select(sl =>
            {
                var claim = claims.FirstOrDefault(c => c.MeetingSeriesSlotId == sl.Id);
                return new BulkAvailabilitySlotDto
                {
                    SlotId = sl.Id,
                    Date = sl.Date,
                    StartTime = sl.StartTime,
                    EndTime = sl.EndTime,
                    LocationId = sl.LocationId,
                    LocationName = sl.Location?.Name,
                    LocationColor = sl.Location?.Color,
                    IsClaimed = claim is not null,
                    ClaimedByItemId = claim?.MeetingSeriesItemId
                };
            })
            .ToList();

        return new BulkAvailabilityResponse
        {
            SeriesId = seriesId,
            MemberId = memberId,
            MemberName = $"{member.FirstName} {member.LastName}",
            Items = items,
            Slots = slots
        };
    }

    public async Task<MeetingSeriesDto?> SubmitBulkAvailabilityAsync(Guid seriesId, Guid memberId, BulkAvailabilityRequest request)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.Items)
                .ThenInclude(i => i.Participants)
            .Include(s => s.Items)
                .ThenInclude(i => i.Availabilities)
            .Include(s => s.Slots)
            .FirstOrDefaultAsync(s => s.Id == seriesId);

        if (series is null) return null;

        var member = await db.Set<TeamMember>().FindAsync(memberId);
        if (member is null) return null;

        var requestedItemIds = request.Availabilities.Select(a => a.ItemId).Distinct().ToList();
        var requestedSlotIds = request.Availabilities.Select(a => a.SlotId).Distinct().ToList();

        foreach (var itemId in requestedItemIds)
        {
            var item = series.Items.FirstOrDefault(i => i.Id == itemId);
            if (item is null)
                throw new InvalidOperationException($"Item {itemId} does not belong to series {seriesId}.");

            var participant = item.Participants.FirstOrDefault(p => p.TeamMemberId == memberId);
            if (participant is null)
                throw new InvalidOperationException($"Member {memberId} is not a participant of item {itemId}.");
        }

        foreach (var slotId in requestedSlotIds)
        {
            var slot = series.Slots.FirstOrDefault(s => s.Id == slotId);
            if (slot is null)
                throw new InvalidOperationException($"Slot {slotId} does not belong to series {seriesId}.");
        }

        var uniqueAvailabilities = request.Availabilities
            .GroupBy(a => new { a.ItemId, a.SlotId })
            .Select(g => g.First())
            .ToList();

        var existingAvailabilities = await db.Set<MeetingSeriesItemAvailability>()
            .Where(a => requestedItemIds.Contains(a.MeetingSeriesItemId) &&
                        a.TeamMemberId == memberId)
            .ToListAsync();

        var existingSet = new HashSet<(Guid ItemId, Guid SlotId)>(
            existingAvailabilities.Select(a => (a.MeetingSeriesItemId, a.MeetingSeriesSlotId)));

        var requestedSet = new HashSet<(Guid ItemId, Guid SlotId)>(
            uniqueAvailabilities.Select(a => (a.ItemId, a.SlotId)));

        var toDelete = existingAvailabilities
            .Where(a => !requestedSet.Contains((a.MeetingSeriesItemId, a.MeetingSeriesSlotId)))
            .ToList();

        var toInsert = uniqueAvailabilities
            .Where(a => !existingSet.Contains((a.ItemId, a.SlotId)))
            .Select(a => new MeetingSeriesItemAvailability
            {
                MeetingSeriesItemId = a.ItemId,
                MeetingSeriesSlotId = a.SlotId,
                TeamMemberId = memberId
            })
            .ToList();

        if (toDelete.Count > 0)
            db.Set<MeetingSeriesItemAvailability>().RemoveRange(toDelete);

        if (toInsert.Count > 0)
            db.Set<MeetingSeriesItemAvailability>().AddRange(toInsert);

        var affectedItemIds = uniqueAvailabilities.Select(a => a.ItemId).Distinct().ToList();

        foreach (var itemId in affectedItemIds.OrderBy(id => id))
        {
            var item = series.Items.First(i => i.Id == itemId);
            if (item.IsConfirmed) continue;

            await CheckAndConfirmItemAsync(itemId, memberId);
        }

        await db.SaveChangesAsync();

        return await GetByIdAsync(seriesId);
    }

    // My Series
    public async Task<IReadOnlyList<MyMeetingSeriesDto>> GetMySeriesAsync(Guid memberId)
    {
        var series = await db.Set<MeetingSeries>()
            .Include(s => s.Items)
                .ThenInclude(i => i.Participants)
            .Where(s => s.Items.Any(i => i.Participants.Any(p => p.TeamMemberId == memberId)))
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var result = series.Select(s =>
        {
            var userItems = s.Items.Where(i => i.Participants.Any(p => p.TeamMemberId == memberId)).ToList();
            var totalItems = userItems.Count;
            var confirmedItems = userItems.Count(i => i.IsConfirmed);
            var openItems = totalItems - confirmedItems;

            var participantRoles = userItems
                .SelectMany(i => i.Participants.Where(p => p.TeamMemberId == memberId))
                .Select(p => p.Role)
                .ToList();

            var role = participantRoles.Contains("Mandatory") ? "Mandatory" : "Optional";

            return new MyMeetingSeriesDto
            {
                SeriesId = s.Id,
                SeriesTitle = s.Title,
                SeriesDescription = s.Description,
                TotalItems = totalItems,
                OpenItems = openItems,
                ConfirmedItems = confirmedItems,
                Role = role,
                CreatedAt = s.CreatedAt
            };
        }).ToList();

        return result;
    }

    // Unconfirm
    public async Task<MeetingSeriesDto?> UnconfirmItemAsync(Guid itemId)
    {
        var item = await db.Set<MeetingSeriesItem>()
            .Include(i => i.MeetingSeries)
            .FirstOrDefaultAsync(i => i.Id == itemId);

        if (item is null) return null;

        if (!item.IsConfirmed || !item.ConfirmedSlotId.HasValue)
            return await GetByIdAsync(item.MeetingSeriesId);

        item.IsConfirmed = false;
        item.ConfirmedSlotId = null;

        var claim = await db.Set<MeetingSeriesSlotClaim>()
            .FirstOrDefaultAsync(c => c.MeetingSeriesItemId == itemId);
        if (claim is not null)
        {
            db.Set<MeetingSeriesSlotClaim>().Remove(claim);
        }

        var session = await db.Set<MeetingSession>()
            .FirstOrDefaultAsync(ms => ms.MeetingSeriesItemId == itemId);
        if (session is not null)
        {
            db.Set<MeetingSession>().Remove(session);
        }

        await db.SaveChangesAsync();

        return await GetByIdAsync(item.MeetingSeriesId);
    }

    private async Task CheckAndConfirmItemAsync(Guid itemId, Guid claimedByMemberId)
    {
        var item = await db.Set<MeetingSeriesItem>()
            .Include(i => i.Participants)
                .ThenInclude(p => p.TeamMember)
            .Include(i => i.Availabilities)
                .ThenInclude(a => a.MeetingSeriesSlot)
                    .ThenInclude(s => s.Location)
            .Include(i => i.MeetingSeries)
            .FirstOrDefaultAsync(i => i.Id == itemId);

        if (item is null) return;

        var mandatoryParticipantIds = item.Participants
            .Where(p => p.Role.ToLowerInvariant() == "mandatory")
            .Select(p => p.TeamMemberId)
            .ToHashSet();

        if (mandatoryParticipantIds.Count == 0)
            return;

        var availabilitiesBySlot = item.Availabilities
            .GroupBy(a => a.MeetingSeriesSlotId)
            .ToDictionary(g => g.Key, g => g.Select(a => a.TeamMemberId).ToHashSet());

        var existingClaims = await db.Set<MeetingSeriesSlotClaim>()
            .Where(c => c.MeetingSeriesId == item.MeetingSeriesId)
            .ToListAsync();

        var slots = item.Availabilities
            .Select(a => a.MeetingSeriesSlot)
            .Where(s => s is not null)
            .Distinct()
            .OrderBy(s => s!.Date)
            .ThenBy(s => s!.StartTime)
            .ToList();

        foreach (var slot in slots)
        {
            if (slot is null) continue;

            var attendeeIds = availabilitiesBySlot.GetValueOrDefault(slot.Id, new HashSet<Guid>());
            if (!mandatoryParticipantIds.IsSubsetOf(attendeeIds))
                continue;

            var existingClaim = existingClaims.FirstOrDefault(c => c.MeetingSeriesSlotId == slot.Id);

            if (existingClaim is null)
            {
                item.IsConfirmed = true;
                item.ConfirmedSlotId = slot.Id;

                var newClaim = new MeetingSeriesSlotClaim
                {
                    MeetingSeriesId = item.MeetingSeriesId,
                    MeetingSeriesSlotId = slot.Id,
                    MeetingSeriesItemId = item.Id,
                    ClaimedByMemberId = claimedByMemberId,
                    ClaimedAt = DateTimeOffset.UtcNow
                };

                db.Set<MeetingSeriesSlotClaim>().Add(newClaim);
                await CreateMeetingSessionFromItemAsync(item, slot);
                break;
            }
            else if (existingClaim.MeetingSeriesItemId == item.Id)
            {
                break;
            }
        }
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
                    item.IsConfirmed = false;
                    item.ConfirmedSlotId = null;

                    var claim = await db.Set<MeetingSeriesSlotClaim>()
                        .FirstOrDefaultAsync(c => c.MeetingSeriesItemId == itemId);
                    if (claim is not null)
                    {
                        db.Set<MeetingSeriesSlotClaim>().Remove(claim);
                    }

                    var meetingSession = await db.Set<MeetingSession>()
                        .FirstOrDefaultAsync(ms => ms.MeetingSeriesItemId == item.Id);
                    if (meetingSession is not null)
                    {
                        db.Set<MeetingSession>().Remove(meetingSession);
                    }
                }
            }
        }
    }

    private async Task CreateMeetingSessionFromItemAsync(MeetingSeriesItem item, MeetingSeriesSlot slot)
    {
        var existingSession = await db.Set<MeetingSession>()
            .FirstOrDefaultAsync(ms => ms.Title == item.Title &&
                                       ms.Date == slot.Date &&
                                       ms.StartTime == slot.StartTime &&
                                       ms.EndTime == slot.EndTime);

        if (existingSession is not null)
        {
            existingSession.MeetingSeriesItemId = item.Id;
            existingSession.MeetingSeriesSlotId = slot.Id;
        }
        else
        {
            var meetingSession = new MeetingSession
            {
                Title = item.Title,
                Description = item.Description,
                Date = slot.Date,
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                Location = ResolveMeetingLocation(slot.Location),
                Type = MeetingType.Discussion,
                Status = MeetingStatus.Filled,
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

    private async Task<MeetingSeriesDto> MapSeriesWithClaimsAsync(MeetingSeries series)
    {
        var claims = await db.Set<MeetingSeriesSlotClaim>()
            .Where(c => c.MeetingSeriesId == series.Id)
            .ToListAsync();

        return new MeetingSeriesDto
        {
            Id = series.Id,
            Title = series.Title,
            Description = series.Description,
            CreatedByMemberId = series.CreatedByMemberId,
            CreatedByMemberName = $"{series.CreatedBy.FirstName} {series.CreatedBy.LastName}",
            IsActive = series.IsActive,
            CreatedAt = series.CreatedAt,
            Slots = series.Slots.Select(sl => ToDtoWithClaim(sl, claims)).ToList(),
            Items = series.Items.Select(i => ToDto(i)).ToList()
        };
    }

    private static MeetingSeriesSlotDto ToDtoWithClaim(MeetingSeriesSlot sl, List<MeetingSeriesSlotClaim> claims)
    {
        var claim = claims.FirstOrDefault(c => c.MeetingSeriesSlotId == sl.Id);
        return new MeetingSeriesSlotDto
        {
            Id = sl.Id,
            Date = sl.Date,
            StartTime = sl.StartTime,
            EndTime = sl.EndTime,
            LocationId = sl.LocationId,
            LocationName = sl.Location?.Name,
            LocationColor = sl.Location?.Color,
            SortOrder = sl.SortOrder,
            IsClaimed = claim is not null,
            ClaimedByItemId = claim?.MeetingSeriesItemId
        };
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
