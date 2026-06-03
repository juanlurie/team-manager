using TeamManager.Api.Application.DTOs.RetroCard;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IRetroCardService
{
    Task<IReadOnlyList<RetroCardDto>> GetBySprintAsync(Guid sprintId, Guid? currentUserId);
    Task<RetroCardDto> CreateAsync(CreateRetroCardRequest request, Guid? authorId = null);
    Task<bool> DeleteAsync(Guid id);
    Task<ToggleVoteResponse?> ToggleVoteAsync(Guid cardId, Guid voterId);
}
