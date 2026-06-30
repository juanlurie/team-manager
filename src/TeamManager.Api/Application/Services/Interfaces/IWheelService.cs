using TeamManager.Api.Application.DTOs.Wheel;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IWheelService
{
    Task<IReadOnlyList<WheelDto>> GetAllAsync();
    Task<WheelDto> CreateAsync(CreateWheelRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<WheelDto?> AddParticipantAsync(Guid wheelId, Guid teamMemberId);
    Task<WheelDto?> RemoveParticipantAsync(Guid wheelId, Guid teamMemberId);
}
