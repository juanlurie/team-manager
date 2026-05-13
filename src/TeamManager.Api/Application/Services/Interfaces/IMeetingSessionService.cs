using TeamManager.Api.Application.DTOs.MeetingSession;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IMeetingSessionService
{
    Task<IReadOnlyList<MeetingSessionDto>> GetAllAsync();
    Task<MeetingSessionDto?> GetByIdAsync(Guid id);
    Task<MeetingSessionDto> CreateAsync(CreateSessionRequest request, Guid createdByMemberId);
    Task<MeetingSessionDto?> UpdateAsync(Guid id, UpdateSessionRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<MeetingSessionDto?> UpdateStatusAsync(Guid id, string status);
    Task<MeetingSessionDto?> BookSlotAsync(Guid sessionId, Guid slotId, Guid memberId, BookSlotRequest request);
    Task<MeetingSessionDto?> UnbookSlotAsync(Guid sessionId, Guid slotId);
}
