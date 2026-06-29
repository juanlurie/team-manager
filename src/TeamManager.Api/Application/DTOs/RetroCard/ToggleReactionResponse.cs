namespace TeamManager.Api.Application.DTOs.RetroCard;

public record ToggleReactionResponse(
    Guid CardId,
    string Emoji,
    int Delta,
    Guid MemberId,
    string MemberName,
    IReadOnlyList<ReactionSummaryDto> Reactions);

public record RetroReactRequest(Guid SprintId, string Emoji);
