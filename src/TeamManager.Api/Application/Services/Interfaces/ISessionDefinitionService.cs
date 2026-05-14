using TeamManager.Api.Application.DTOs.SessionDefinition;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ISessionDefinitionService
{
    Task<IReadOnlyList<SessionDefinitionDto>> GetAllAsync();
    Task<SessionDefinitionDto?> GetByIdAsync(Guid id);
    Task<SessionDefinitionDto> CreateAsync(CreateSessionDefinitionRequest request, Guid createdByMemberId);
    Task<SessionDefinitionDto?> UpdateAsync(Guid id, UpdateSessionDefinitionRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<SessionDefinitionDto?> CreateSlotsAsync(Guid id, CreateSessionSlotsRequest request);
    Task<SessionDefinitionDto?> UpdateSlotAsync(Guid id, Guid slotId, UpdateSessionSlotRequest request);
    Task<bool> DeleteSlotAsync(Guid id, Guid slotId);
    Task<SessionDefinitionDto?> BookSlotAsync(Guid sessionId, Guid slotId, Guid memberId, BookSessionSlotRequest request);
    Task<SessionDefinitionDto?> UnbookSlotAsync(Guid sessionId, Guid slotId, Guid memberId);
}
