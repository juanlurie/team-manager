using TeamManager.Api.Application.DTOs.WinOfTheWeek;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IWinOfTheWeekService
{
    Task<WinWeekDto?> GetCurrentWeekAsync(Guid currentMemberId, Guid seriesId);
    Task<WinNominationDto> CreateNominationAsync(Guid memberId, CreateNominationRequest request, Guid seriesId = default);
    Task<WinNominationDto> UpdateNominationAsync(Guid memberId, Guid nominationId, CreateNominationRequest request);
    Task<bool> DeleteNominationAsync(Guid memberId, Guid nominationId);
    Task<WinVoteDto> VoteAsync(Guid memberId, Guid nominationId);
    Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId);
    Task<WinWeekDto> CloseWeekAsync(Guid memberId, Guid seriesId, CloseWeekRequest request);
    Task<WinWeekDto> OpenNextWeekAsync(Guid memberId, Guid seriesId);
    Task<WinWeekDto> OpenVotingAsync(Guid memberId, Guid seriesId);
    Task<WinWeekDto> ReopenNominationsAsync(Guid memberId, Guid seriesId);
    Task<WinWeekDto> StartSuddenDeathAsync(Guid memberId, Guid seriesId, StartSuddenDeathRequest request);
    Task<IReadOnlyList<WinWeekHistoryDto>> GetHistoryAsync(Guid seriesId, int? year = null, int limit = 52);
    Task<WinWeekDetailDto> GetWeekDetailAsync(Guid weekId, Guid memberId);
}
