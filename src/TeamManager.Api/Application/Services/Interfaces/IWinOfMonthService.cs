using TeamManager.Api.Application.DTOs.WinOfTheMonth;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IWinOfMonthService
{
    Task<WinMonthDto?> GetCurrentMonthAsync(Guid memberId);
    Task<IReadOnlyList<WinMonthHistoryDto>> GetHistoryAsync(int? year = null);
    Task<WinMonthVoteDto> VoteAsync(Guid memberId, Guid nominationId);
    Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId);
    Task<WinMonthDto> CloseMonthAsync(Guid memberId);
    Task<WinMonthDto> GenerateFromClosedWeeksAsync(Guid memberId);
}
