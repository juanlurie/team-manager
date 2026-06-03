namespace TeamManager.Api.Application.DTOs.RetroCard;

public record ToggleVoteResponse(Guid CardId, int VoteCount, int MyVoteCount, bool Voted);
