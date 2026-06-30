using TeamManager.Api.Application.DTOs.MeetingSeries;
using TeamManager.Api.Application.DTOs.MeetingSeriesItem;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IMeetingSeriesService
{
    Task<IReadOnlyList<MeetingSeriesDto>> GetAllAsync();
    Task<MeetingSeriesDto?> GetByIdAsync(Guid id);
    Task<MeetingSeriesDto> CreateAsync(CreateMeetingSeriesRequest request, Guid createdByMemberId);
    Task<MeetingSeriesDto?> UpdateAsync(Guid id, UpdateMeetingSeriesRequest request);
    Task<bool> DeleteAsync(Guid id);
    
    // Slots
    Task<IReadOnlyList<MeetingSeriesSlotDto>> GetSeriesSlotsAsync(Guid seriesId);
    Task<MeetingSeriesDto?> CreateSeriesSlotsAsync(Guid seriesId, CreateMeetingSeriesSlotsRequest request);
    Task<MeetingSeriesDto?> UpdateSeriesSlotAsync(Guid seriesId, Guid slotId, UpdateMeetingSeriesSlotRequest request);
    Task<bool> DeleteSeriesSlotAsync(Guid seriesId, Guid slotId);
    
    // Items
    Task<IReadOnlyList<MeetingSeriesItemDto>> GetSeriesItemsAsync(Guid seriesId);
    Task<MeetingSeriesDto?> CreateSeriesItemAsync(Guid seriesId, CreateMeetingSeriesItemRequest request);
    Task<MeetingSeriesDto?> UpdateSeriesItemAsync(Guid seriesId, Guid itemId, UpdateMeetingSeriesItemRequest request);
    Task<bool> DeleteSeriesItemAsync(Guid seriesId, Guid itemId);
    
    // Availability
    Task<IReadOnlyList<MeetingSeriesItemAvailabilityDto>> GetItemAvailabilitiesAsync(Guid itemId);
    Task<MeetingSeriesDto?> AddItemAvailabilityAsync(Guid itemId, AddMeetingSeriesItemAvailabilityRequest request);
    Task<MeetingSeriesDto?> RemoveItemAvailabilityAsync(Guid itemId, Guid availabilityId);
    
    // Bulk Availability
    Task<BulkAvailabilityResponse> GetBulkAvailabilityAsync(Guid seriesId, Guid memberId);
    Task<MeetingSeriesDto?> SubmitBulkAvailabilityAsync(Guid seriesId, Guid memberId, BulkAvailabilityRequest request);
    
    // My Availability (unified)
    Task<string[]> GetMyAvailabilityAsync(Guid seriesId, Guid memberId);
    Task SetMyAvailabilityAsync(Guid seriesId, Guid memberId, SetMyAvailabilityRequest request);
    
    // Unconfirm
    Task<MeetingSeriesDto?> UnconfirmItemAsync(Guid itemId);
    
    // My Series
    Task<IReadOnlyList<MyMeetingSeriesDto>> GetMySeriesAsync(Guid memberId);
}