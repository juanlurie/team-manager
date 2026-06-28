using TeamManager.Api.Application.DTOs.ScrumPoker;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IScrumPokerService
{
    Task<List<ScrumPokerSessionDto>> GetActiveSessionsAsync(Guid memberId);
    Task<ScrumPokerSessionDetailDto> GetSessionAsync(Guid sessionId, Guid memberId);
    Task<ScrumPokerSessionDetailDto> CreateSessionAsync(Guid memberId, CreateScrumPokerSessionRequest request);
    Task<ScrumPokerSessionDetailDto> CastVoteAsync(Guid sessionId, Guid memberId, CastScrumPokerVoteRequest request);
    Task<ScrumPokerSessionDetailDto> RevealVotesAsync(Guid sessionId, Guid memberId);
    Task<ScrumPokerSessionDetailDto> ResetSessionAsync(Guid sessionId, Guid memberId);
    Task<bool> DeleteSessionAsync(Guid sessionId, Guid memberId);
}
