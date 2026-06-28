using TeamManager.Api.Application.DTOs.Vote;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ISprintVoteService
{
    Task<SprintVotesResponse> GetVotesAsync(Guid sprintId);
    Task<SprintVoteDto> CastVoteAsync(Guid sprintId, CastVoteRequest request);
    Task<VoteTallyDto> AwardMvpAsync(Guid sprintId);
}
