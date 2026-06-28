namespace TeamManager.Api.Application.DTOs.Vote;

public record SprintVoteDto(
    Guid Id,
    Guid VoterSprintMemberId,
    string VoterName,
    Guid NomineeSprintMemberId,
    string NomineeName);

public record CastVoteRequest(Guid VoterSprintMemberId, Guid NomineeSprintMemberId);

public record VoteTallyDto(Guid SprintMemberId, string MemberName, int Votes, bool IsMvp);

public record SprintVotesResponse(List<SprintVoteDto> Votes, List<VoteTallyDto> Tally);
