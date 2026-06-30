using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroCard;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class RetroCardService(AppDbContext db) : IRetroCardService
{
    public async Task<IReadOnlyList<RetroCardDto>> GetBySprintAsync(Guid sprintId, Guid? currentUserId)
    {
        var cards = await db.RetroCards
            .Where(c => c.SprintId == sprintId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var cardIds = cards.Select(c => c.Id).ToList();
        var votes = await db.RetroVotes
            .Where(v => cardIds.Contains(v.CardId))
            .ToListAsync();

        var voteCounts = votes.GroupBy(v => v.CardId)
            .ToDictionary(g => g.Key, g => g.Count());

        var myVotes = currentUserId.HasValue
            ? votes.Where(v => v.VoterId == currentUserId.Value)
                   .GroupBy(v => v.CardId)
                   .ToDictionary(g => g.Key, g => g.Count())
            : [];

        var reactions = await db.RetroCardReactions
            .Where(r => r.SprintId == sprintId)
            .ToListAsync();

        var reactionsByCard = reactions
            .GroupBy(r => r.CardId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<ReactionSummaryDto>)g
                    .GroupBy(r => r.Emoji)
                    .Select(eg => new ReactionSummaryDto
                    {
                        Emoji = eg.Key,
                        Count = eg.Count(),
                        Mine = currentUserId.HasValue && eg.Any(r => r.MemberId == currentUserId.Value),
                    })
                    .OrderByDescending(s => s.Count)
                    .ToList());

        return cards.Select(c => ToDto(c, voteCounts, myVotes, reactionsByCard)).ToList();
    }

    public async Task<RetroCardDto> CreateAsync(CreateRetroCardRequest request, Guid? authorId = null)
    {
        string authorName = request.AuthorName;
        if (authorId.HasValue)
        {
            var member = await db.TeamMembers.FindAsync(authorId.Value);
            if (member != null)
                authorName = $"{member.FirstName} {member.LastName}".Trim();
        }

        var card = new RetroCard
        {
            SprintId   = request.SprintId,
            Column     = request.Column,
            Text       = request.Text,
            AuthorName = authorName,
            AuthorId   = authorId,
            CreatedAt  = DateTimeOffset.UtcNow,
        };
        db.RetroCards.Add(card);
        await db.SaveChangesAsync();
        return ToDto(card, [], [], []);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var card = await db.RetroCards.FindAsync(id);
        if (card is null) return false;
        db.RetroCards.Remove(card);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<ToggleVoteResponse?> ToggleVoteAsync(Guid cardId, Guid voterId)
    {
        var card = await db.RetroCards.FindAsync(cardId);
        if (card is null) return null;

        var existing = await db.RetroVotes
            .FirstOrDefaultAsync(v => v.CardId == cardId && v.VoterId == voterId);

        if (existing is not null)
        {
            db.RetroVotes.Remove(existing);
            await db.SaveChangesAsync();
        }
        else
        {
            // Check budget: max 3 votes per voter per sprint
            var used = await db.RetroVotes
                .Where(v => v.VoterId == voterId)
                .Join(db.RetroCards, v => v.CardId, c => c.Id, (v, c) => c)
                .CountAsync(c => c.SprintId == card.SprintId);

            if (used >= 3)
                return null; // budget exhausted — controller returns 409

            db.RetroVotes.Add(new RetroVote { CardId = cardId, VoterId = voterId });
            await db.SaveChangesAsync();
        }

        var voteCount = await db.RetroVotes.CountAsync(v => v.CardId == cardId);
        var myVoteCount = existing is not null ? 0 : 1;
        return new ToggleVoteResponse(cardId, voteCount, myVoteCount, existing is null);
    }

    public async Task<ToggleReactionResponse?> ToggleReactionAsync(
        Guid cardId, Guid sprintId, string emoji, Guid memberId)
    {
        var card = await db.RetroCards.FindAsync(cardId);
        if (card is null) return null;

        var member = await db.TeamMembers.FindAsync(memberId);
        var memberName = member is null ? "" : $"{member.FirstName} {member.LastName}".Trim();

        var existing = await db.RetroCardReactions
            .FirstOrDefaultAsync(r => r.CardId == cardId && r.MemberId == memberId && r.Emoji == emoji);

        int delta;
        if (existing is not null)
        {
            db.RetroCardReactions.Remove(existing);
            delta = -1;
        }
        else
        {
            db.RetroCardReactions.Add(new RetroCardReaction
            {
                CardId     = cardId,
                SprintId   = sprintId,
                MemberId   = memberId,
                MemberName = memberName,
                Emoji      = emoji,
            });
            delta = 1;
        }
        await db.SaveChangesAsync();

        var cardReactions = await db.RetroCardReactions
            .Where(r => r.CardId == cardId)
            .ToListAsync();

        var summary = cardReactions
            .GroupBy(r => r.Emoji)
            .Select(g => new ReactionSummaryDto
            {
                Emoji = g.Key,
                Count = g.Count(),
                Mine = g.Any(r => r.MemberId == memberId),
            })
            .OrderByDescending(s => s.Count)
            .ToList();

        return new ToggleReactionResponse(cardId, emoji, delta, memberId, memberName, summary);
    }

    private static RetroCardDto ToDto(
        RetroCard card,
        Dictionary<Guid, int> voteCounts,
        Dictionary<Guid, int> myVotes,
        Dictionary<Guid, IReadOnlyList<ReactionSummaryDto>> reactionsByCard) => new()
    {
        Id         = card.Id,
        SprintId   = card.SprintId,
        Column     = card.Column,
        Text       = card.Text,
        AuthorName = card.AuthorName,
        AuthorId   = card.AuthorId,
        CreatedAt  = card.CreatedAt,
        VoteCount  = voteCounts.GetValueOrDefault(card.Id),
        MyVoteCount = myVotes.GetValueOrDefault(card.Id),
        Reactions  = reactionsByCard.GetValueOrDefault(card.Id) ?? [],
    };
}
