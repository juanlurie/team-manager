using TeamManager.Api.Application.DTOs.WinOfTheWeek;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IWinOfTheWeekService
{
    Task<WinWeekDto> GetCurrentWeekAsync(Guid currentMemberId);
    Task<WinNominationDto> CreateNominationAsync(Guid memberId, CreateNominationRequest request);
    Task<WinVoteDto> VoteAsync(Guid memberId, Guid nominationId);
    Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId);
    Task<WinWeekDto> CloseWeekAsync(Guid memberId, CloseWeekRequest request);
    Task<WinWeekDto> OpenNextWeekAsync(Guid memberId);
    Task<WinWeekDto> OpenVotingAsync(Guid memberId);
    Task<IReadOnlyList<WinWeekHistoryDto>> GetHistoryAsync(int? year = null, int limit = 52);
    Task<WinWeekDetailDto> GetWeekDetailAsync(Guid weekId, Guid memberId);
}
