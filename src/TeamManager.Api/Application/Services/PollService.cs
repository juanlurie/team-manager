using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Poll;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Infrastructure.Slugs;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class PollService(AppDbContext db)
{
    private const int MinOptions = 2;
    private const int MaxOptions = 8;

    public async Task<List<PollSummaryDto>> GetOpenPollsAsync()
    {
        await AutoCloseDuePollsAsync();

        var polls = await db.Polls
            .Include(p => p.CreatedByMember)
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .Where(p => !p.IsClosed && p.RetroSessionId == null)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return polls.Select(p => new PollSummaryDto
        {
            Id = p.Id,
            Question = p.Question,
            CreatedByName = p.CreatedByMember != null ? $"{p.CreatedByMember.FirstName} {p.CreatedByMember.LastName}" : "Someone",
            OptionCount = p.Options.Count,
            TotalVotes = p.HideResultsUntilClosed ? 0 : p.Votes.Count,
            IsClosed = p.IsClosed,
            HideResultsUntilClosed = p.HideResultsUntilClosed,
            ScheduledCloseAt = p.ScheduledCloseAt,
            CreatedAt = p.CreatedAt
        }).ToList();
    }

    public async Task<PollDetailDto> CreateAsync(Guid memberId, string question, List<string> options, bool hideResultsUntilClosed, DateTimeOffset? scheduledCloseAt, Guid? retroSessionId = null)
    {
        var trimmed = options.Select(o => o.Trim()).Where(o => o.Length > 0).Distinct().ToList();
        if (string.IsNullOrWhiteSpace(question))
            throw new InvalidOperationException("A poll needs a question.");
        if (trimmed.Count < MinOptions)
            throw new InvalidOperationException($"A poll needs at least {MinOptions} options.");
        if (trimmed.Count > MaxOptions)
            throw new InvalidOperationException($"A poll can have at most {MaxOptions} options.");
        if (scheduledCloseAt.HasValue && scheduledCloseAt.Value <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("The close date must be in the future.");

        var poll = new Poll
        {
            Question = question.Trim(),
            CreatedByMemberId = memberId,
            HideResultsUntilClosed = hideResultsUntilClosed,
            ScheduledCloseAt = scheduledCloseAt,
            RetroSessionId = retroSessionId,
            Slug = await GenerateUniqueSlugAsync(),
        };
        // PollId gets wired up automatically by EF via the navigation relationship on save.
        poll.Options = trimmed.Select((text, i) => new PollOption { Text = text, DisplayOrder = i }).ToList();

        db.Polls.Add(poll);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("poll_created", new { pollId = poll.Id, retroSessionId = poll.RetroSessionId });

        return await GetDetailAsync(poll.Id, memberId);
    }

    private async Task<string> GenerateUniqueSlugAsync()
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var candidate = SlugGenerator.Generate();
            if (!await db.Polls.AnyAsync(p => p.Slug == candidate)) return candidate;
        }
        return $"{SlugGenerator.Generate()}-{Guid.NewGuid().ToString()[..4]}";
    }

    /// <summary>Resolves a share-URL path segment to the poll's real id -- either a raw
    /// GUID (older links) or a friendly slug.</summary>
    public async Task<Guid?> ResolvePollIdAsync(string idOrSlug)
    {
        if (Guid.TryParse(idOrSlug, out var guid)) return guid;
        return await db.Polls
            .Where(p => p.Slug == idOrSlug)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<PollDetailDto> VoteAsync(Guid memberId, Guid pollId, Guid optionId)
    {
        var poll = await db.Polls.FindAsync(pollId) ?? throw new KeyNotFoundException("Poll not found.");
        if (poll.IsClosed) throw new InvalidOperationException("This poll is closed.");

        var optionBelongs = await db.PollOptions.AnyAsync(o => o.Id == optionId && o.PollId == pollId);
        if (!optionBelongs) throw new InvalidOperationException("That option doesn't belong to this poll.");

        var existing = await db.PollVotes.FirstOrDefaultAsync(v => v.PollId == pollId && v.MemberId == memberId);
        if (existing is not null)
        {
            existing.PollOptionId = optionId;
            existing.VotedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            db.PollVotes.Add(new PollVote { PollId = pollId, PollOptionId = optionId, MemberId = memberId });
        }
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("poll_vote_cast", new { pollId, retroSessionId = poll.RetroSessionId });

        return await GetDetailAsync(pollId, memberId);
    }

    public async Task<PollDetailDto> ClosePollAsync(Guid memberId, Guid pollId)
    {
        var poll = await db.Polls.FindAsync(pollId) ?? throw new KeyNotFoundException("Poll not found.");
        if (poll.CreatedByMemberId != memberId) throw new InvalidOperationException("Only the poll creator can close it.");

        poll.IsClosed = true;
        poll.ClosedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("poll_closed", new { pollId, retroSessionId = poll.RetroSessionId });

        return await GetDetailAsync(pollId, memberId);
    }

    public async Task<PollDetailDto> UpdateSettingsAsync(Guid memberId, Guid pollId, bool hideResultsUntilClosed, DateTimeOffset? scheduledCloseAt)
    {
        var poll = await db.Polls.FindAsync(pollId) ?? throw new KeyNotFoundException("Poll not found.");
        if (poll.CreatedByMemberId != memberId) throw new InvalidOperationException("Only the poll creator can edit this poll.");
        if (poll.IsClosed) throw new InvalidOperationException("This poll is already closed.");
        if (scheduledCloseAt.HasValue && scheduledCloseAt.Value <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("The close date must be in the future.");

        poll.HideResultsUntilClosed = hideResultsUntilClosed;
        poll.ScheduledCloseAt = scheduledCloseAt;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("poll_settings_updated", new { pollId });

        return await GetDetailAsync(pollId, memberId);
    }

    public async Task DeletePollAsync(Guid memberId, Guid pollId)
    {
        var poll = await db.Polls.FindAsync(pollId) ?? throw new KeyNotFoundException("Poll not found.");
        if (poll.CreatedByMemberId != memberId) throw new InvalidOperationException("Only the poll creator can delete it.");

        db.Polls.Remove(poll);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("poll_deleted", new { pollId, retroSessionId = poll.RetroSessionId });
    }

    public async Task<List<PollDetailDto>> GetRetroSessionPollsAsync(Guid retroSessionId, Guid memberId)
    {
        var pollIds = await db.Polls
            .Where(p => p.RetroSessionId == retroSessionId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => p.Id)
            .ToListAsync();

        var results = new List<PollDetailDto>();
        foreach (var id in pollIds)
            results.Add(await GetDetailAsync(id, memberId));
        return results;
    }

    // Mirrors the QuizGameProgressWorker pattern: closing happens lazily here on every fetch,
    // and a background worker (PollProgressWorker) also drives it so a poll with a scheduled
    // close date still closes on time even if nobody happens to load it right then.
    public async Task<List<Guid>> AutoCloseDuePollsAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var due = await db.Polls
            .Where(p => !p.IsClosed && p.ScheduledCloseAt != null && p.ScheduledCloseAt <= now)
            .ToListAsync();

        if (due.Count == 0) return [];

        foreach (var poll in due)
        {
            poll.IsClosed = true;
            poll.ClosedAt = now;
        }
        await db.SaveChangesAsync();

        var ids = due.Select(p => p.Id).ToList();
        foreach (var id in ids)
            _ = WebSocketMiddleware.BroadcastAsync("poll_closed", new { pollId = id });

        return ids;
    }

    public async Task<PollDetailDto> GetDetailAsync(Guid pollId, Guid memberId, bool revealForCreator = false)
    {
        await AutoCloseDuePollsAsync();

        var poll = await db.Polls
            .Include(p => p.CreatedByMember)
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.Id == pollId)
            ?? throw new KeyNotFoundException("Poll not found.");

        // Polls created before slugs existed have a null Slug -- assign one lazily here
        // instead of a data migration.
        if (poll.Slug is null)
        {
            poll.Slug = await GenerateUniqueSlugAsync();
            await db.SaveChangesAsync();
        }

        var votes = await db.PollVotes.Where(v => v.PollId == pollId).ToListAsync();
        var totalVotes = votes.Count;
        var myVote = votes.FirstOrDefault(v => v.MemberId == memberId);

        // While hidden, results stay withheld from everyone by default -- including the creator
        // -- but the creator can explicitly opt to peek at the live tally for themselves via
        // revealForCreator. This is checked against the poll's actual CreatedByMemberId, not
        // trusted from the caller, so passing the flag does nothing for anyone else.
        var isCreator = poll.CreatedByMemberId == memberId;
        var resultsVisible = poll.IsClosed || !poll.HideResultsUntilClosed || (isCreator && revealForCreator);

        var options = poll.Options.OrderBy(o => o.DisplayOrder).Select(o =>
        {
            var count = votes.Count(v => v.PollOptionId == o.Id);
            return new PollOptionResultDto
            {
                Id = o.Id,
                Text = o.Text,
                VoteCount = resultsVisible ? count : 0,
                Percentage = resultsVisible && totalVotes > 0 ? Math.Round(count * 100.0 / totalVotes, 1) : 0
            };
        }).ToList();

        return new PollDetailDto
        {
            Id = poll.Id,
            Slug = poll.Slug,
            Question = poll.Question,
            CreatedByName = poll.CreatedByMember != null ? $"{poll.CreatedByMember.FirstName} {poll.CreatedByMember.LastName}" : "Someone",
            IsClosed = poll.IsClosed,
            IsCreator = isCreator,
            HideResultsUntilClosed = poll.HideResultsUntilClosed,
            ResultsVisible = resultsVisible,
            IsPeekingAsCreator = isCreator && revealForCreator && poll.HideResultsUntilClosed && !poll.IsClosed,
            ScheduledCloseAt = poll.ScheduledCloseAt,
            TotalVotes = resultsVisible ? totalVotes : 0,
            MyOptionId = myVote?.PollOptionId,
            CreatedAt = poll.CreatedAt,
            Options = options
        };
    }
}
