using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Infrastructure.Slugs;

namespace TeamManager.Api.Application.Services;

public class GuestWinOfTheWeekService(AppDbContext db, IHttpContextAccessor httpContextAccessor, IWinOfTheWeekService wowService, WowVotingService voting, IWowNotifier notifier)
{
    private const int MaxVotesPerPerson = WinOfTheWeekLimits.MaxVotesPerPerson;
    private const int MaxNominationsPerPerson = WinOfTheWeekLimits.MaxNominationsPerPerson;
    public async Task<GuestTokenDto> GetOrGenerateGuestTokenAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId)
            ?? throw new KeyNotFoundException("Week not found.");

        if (string.IsNullOrEmpty(week.GuestToken))
        {
            // A friendly "adjective-noun" slug instead of the previous 256-bit random
            // token -- a deliberate, explicitly-requested tradeoff: this token is the sole
            // credential for anonymous guest access (no login), so it's far more guessable
            // than before (~4,700 combinations vs. astronomically many). Acceptable here
            // because guest access is low-stakes (voting/nominating in a team fun feature),
            // not because the entropy loss doesn't matter.
            week.GuestToken = await GenerateUniqueGuestTokenAsync();
            await db.SaveChangesAsync();
        }

        var baseUrl = GetBaseUrl();
        return new GuestTokenDto(week.GuestToken, $"{baseUrl}/guest/wow/{week.GuestToken}");
    }

    private async Task<string> GenerateUniqueGuestTokenAsync()
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var candidate = SlugGenerator.Generate();
            if (!await db.WinWeeks.AnyAsync(w => w.GuestToken == candidate)) return candidate;
        }
        return $"{SlugGenerator.Generate()}-{Guid.NewGuid().ToString()[..4]}";
    }

    public async Task<GuestWinWeekDto> GetWeekByTokenAsync(string token, string guestSessionId)
    {
        var week = await db.WinWeeks
            .Include(w => w.Series)
            .FirstOrDefaultAsync(w => w.GuestToken == token)
            ?? throw new KeyNotFoundException("Invalid or expired guest link.");

        // Expired sudden-death / hype-battle resolution moved to WowTiebreakerProgressWorker so this
        // GET (polled by every guest) doesn't race member polls into a double close. Quiz stays here
        // — it self-guards with an atomic claim. See WinOfTheWeekService.GetCurrentWeekAsync.
        await wowService.ClearExpiredQuizAsync(week);

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == week.Id)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var nominationIds = nominations.Select(n => n.Id).ToList();
        var guestNominationCount = nominations.Count(n => n.GuestSessionId == guestSessionId);
        var guestCardsSpent = nominations.Count(n => n.GuestCardAppliedBySessionId == guestSessionId);

        var guestVotedIds = await db.WinVotes
            .Where(v => v.GuestSessionId == guestSessionId && nominationIds.Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        int guestVoteCount = guestVotedIds.Count;
        int votesRemaining = 0;

        if (week.Status == WinWeekStatus.SuddenDeath && !string.IsNullOrEmpty(week.TiedNominationIds))
        {
            var tiedIds = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
            var suddenDeathVotes = guestVotedIds.Count(id => tiedIds.Contains(id));
            votesRemaining = Math.Max(0, 1 - suddenDeathVotes);
        }
        else if (week.Status == WinWeekStatus.Voting)
        {
            votesRemaining = Math.Max(0, MaxVotesPerPerson - guestVoteCount);
        }

        WinNomination? winner = null;
        if (week.WinnerNominationId.HasValue)
            winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId.Value);

        return new GuestWinWeekDto
        {
            Id = week.Id,
            WeekStart = week.WeekStart,
            Status = week.Status.ToString(),
            IsNominatingOpen = week.Status == WinWeekStatus.Nominating,
            IsVotingOpen = week.Status == WinWeekStatus.Voting || week.Status == WinWeekStatus.SuddenDeath,
            UserNominationsRemaining = Math.Max(0, MaxNominationsPerPerson - guestNominationCount),
            UserVotesRemaining = votesRemaining,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            WinnerTitle = winner?.Title,
            WinnerStory = week.WinnerStory,
            SuddenDeathEndsAt = week.SuddenDeathEndsAt,
            HypeBattleEndsAt = week.HypeBattleEndsAt,
            QuizEndsAt = week.QuizEndsAt,
            QuizQuestion = week.QuizQuestion,
            QuizOptions = week.QuizOptionsJson != null
                ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(week.QuizOptionsJson) ?? []
                : [],
            QuizAnsweredMemberIds = await db.WinQuizAnswers.Where(a => a.WinWeekId == week.Id).Select(a => a.MemberId).ToListAsync(),
            QuizRevealed = week.QuizRevealed,
            QuizRevealEndsAt = week.QuizRevealed && !week.QuizWinnerMemberId.HasValue
                ? week.QuizRevealedAt?.AddSeconds(WinOfTheWeekService.QuizRevealDisplaySeconds) : null,
            QuizCorrectIndex = week.QuizRevealed ? week.QuizCorrectIndex : null,
            QuizIsAiGenerated = week.QuizIsAiGenerated,
            QuizWinnerName = week.QuizWinnerMemberId.HasValue
                ? nominations.FirstOrDefault(n => n.NomineeMemberId == week.QuizWinnerMemberId.Value) is { } wn
                    ? $"{wn.Nominee.FirstName} {wn.Nominee.LastName}" : null
                : null,
            QuizEliminatedMemberIds = !string.IsNullOrEmpty(week.QuizEliminatedMemberIds)
                ? System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(week.QuizEliminatedMemberIds) ?? []
                : [],
            TiedNominationIds = !string.IsNullOrEmpty(week.TiedNominationIds)
                ? System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? []
                : [],
            PowerUpsEnabled = week.Series?.PowerUpsEnabled ?? true,
            HideVoteCounts = week.Series?.HideVoteCounts ?? false,
            GuestTokenBalance = Math.Max(0, 1 - guestCardsSpent),
            Nominations = nominations.Select(n => new GuestNominationDto
            {
                Id = n.Id,
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                NominatorDisplayName = n.TeamMember != null
                    ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
                    : (n.GuestName ?? "Guest"),
                Title = n.Title,
                Description = n.Description,
                VoteCount = n.Votes.Count,
                HasVoted = guestVotedIds.Contains(n.Id),
                IsOwned = n.GuestSessionId == guestSessionId,
                CreatedAt = n.CreatedAt,
                PowerUp = n.PowerUp,
                ChaosCard = n.ChaosCard,
                HypeMeterCount = n.HypeMeterCount
            }).ToList()
        };
    }

    public async Task<GuestNominationDto> CreateGuestNominationAsync(string token, GuestCreateNominationRequest request)
    {
        var week = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.GuestToken == token)
            ?? throw new KeyNotFoundException("Invalid or expired guest link.");

        if (week.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations are not open for the current week.");

        var guestNominationCount = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.GuestSessionId == request.GuestSessionId);

        if (guestNominationCount >= MaxNominationsPerPerson)
            throw new InvalidOperationException($"You can only submit up to {MaxNominationsPerPerson} nominations per week.");

        var nomineeExists = await db.TeamMembers
            .AnyAsync(m => m.Id == request.NomineeMemberId && m.IsActive);

        if (!nomineeExists)
            throw new KeyNotFoundException("The selected nominee was not found.");

        var nomination = new WinNomination
        {
            WinWeekId = week.Id,
            TeamMemberId = null,
            GuestName = request.GuestName.Trim(),
            GuestSessionId = request.GuestSessionId,
            NomineeMemberId = request.NomineeMemberId,
            Title = request.Title,
            Description = request.Description
        };

        db.WinNominations.Add(nomination);
        await db.SaveChangesAsync();

        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();

        var dto = new GuestNominationDto
        {
            Id = nomination.Id,
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            NominatorDisplayName = nomination.GuestName,
            Title = nomination.Title,
            Description = nomination.Description,
            VoteCount = 0,
            CreatedAt = nomination.CreatedAt
        };

        notifier.Broadcast("nomination_created", new { nomination = dto }, guestAllowed: true);

        return dto;
    }

    public async Task<GuestNominationDto> UpdateGuestNominationAsync(string token, Guid nominationId, string guestSessionId, GuestUpdateNominationRequest request)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .Include(n => n.Nominee)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token || nomination.GuestSessionId != guestSessionId)
            throw new InvalidOperationException("You can only edit your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be edited before voting opens.");

        var nomineeExists = await db.TeamMembers.AnyAsync(m => m.Id == request.NomineeMemberId && m.IsActive);
        if (!nomineeExists)
            throw new KeyNotFoundException("The selected nominee was not found.");

        nomination.NomineeMemberId = request.NomineeMemberId;
        nomination.Title = request.Title;
        nomination.Description = request.Description;
        await db.SaveChangesAsync();

        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();

        var dto = new GuestNominationDto
        {
            Id = nomination.Id,
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            NominatorDisplayName = nomination.GuestName ?? "Guest",
            Title = nomination.Title,
            Description = nomination.Description,
            VoteCount = 0,
            HasVoted = false,
            IsOwned = true,
            CreatedAt = nomination.CreatedAt
        };

        notifier.Broadcast("nomination_updated", new { nomination = dto }, guestAllowed: true);
        return dto;
    }

    public async Task DeleteGuestNominationAsync(string token, Guid nominationId, string guestSessionId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token || nomination.GuestSessionId != guestSessionId)
            throw new InvalidOperationException("You can only delete your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be deleted before voting opens.");

        db.WinNominations.Remove(nomination);
        await db.SaveChangesAsync();

        notifier.Broadcast("nomination_deleted", new { nominationId }, guestAllowed: true);
    }

    public Task<WinVoteDto> VoteAsync(string token, Guid nominationId, string guestSessionId) =>
        voting.CastVoteAsync(nominationId, WowVoter.Guest(guestSessionId), requireGuestToken: token);

    public Task<bool> RemoveVoteAsync(string token, Guid nominationId, string guestSessionId) =>
        voting.RemoveVoteAsync(nominationId, WowVoter.Guest(guestSessionId), requireGuestToken: token);

    public async Task<GuestNominationDto> ApplyGuestPowerUpAsync(string token, Guid nominationId, string guestSessionId, string type)
    {
        var validPowerUps = new HashSet<string> { "Spotlight" };
        if (!validPowerUps.Contains(type))
            throw new InvalidOperationException($"Invalid power-up type: {type}");

        var nomination = await db.WinNominations
            .Include(n => n.WinWeek).ThenInclude(w => w.Series)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        if (!(nomination.WinWeek.Series?.PowerUpsEnabled ?? true))
            throw new InvalidOperationException("Power-ups are disabled for this series.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting && nomination.WinWeek.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Power-ups can only be applied during voting.");

        if (nomination.GuestSessionId == guestSessionId)
            throw new InvalidOperationException("You cannot apply a power-up to your own nomination.");

        if (nomination.PowerUp is not null)
            throw new InvalidOperationException("A power-up has already been applied to this nomination.");

        var alreadySpent = await db.WinNominations
            .AnyAsync(n => n.WinWeekId == nomination.WinWeekId && n.GuestCardAppliedBySessionId == guestSessionId);
        if (alreadySpent)
            throw new InvalidOperationException("You have already spent your token this week.");

        nomination.PowerUp = type;
        nomination.GuestCardAppliedBySessionId = guestSessionId;
        await db.SaveChangesAsync();

        var dto = MapGuestNominationDto(nomination, guestSessionId);
        notifier.Broadcast("nomination_updated", new { nomination = dto }, guestAllowed: true);
        return dto;
    }

    public async Task<GuestNominationDto> ApplyGuestChaosCardAsync(string token, Guid nominationId, string guestSessionId, string type)
    {
        var validCards = new HashSet<string> { "TinyText", "Autocorrect", "RandomCase", "Hangman" };
        if (!validCards.Contains(type))
            throw new InvalidOperationException($"Invalid chaos card type: {type}");

        var nomination = await db.WinNominations
            .Include(n => n.WinWeek).ThenInclude(w => w.Series)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        if (!(nomination.WinWeek.Series?.PowerUpsEnabled ?? true))
            throw new InvalidOperationException("Power-ups are disabled for this series.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting && nomination.WinWeek.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Chaos cards can only be applied during voting.");

        if (nomination.GuestSessionId == guestSessionId)
            throw new InvalidOperationException("You cannot apply a chaos card to your own nomination.");

        if (nomination.ChaosCard is not null)
            throw new InvalidOperationException("A chaos card has already been applied to this nomination.");

        var alreadySpent = await db.WinNominations
            .AnyAsync(n => n.WinWeekId == nomination.WinWeekId && n.GuestCardAppliedBySessionId == guestSessionId);
        if (alreadySpent)
            throw new InvalidOperationException("You have already spent your token this week.");

        nomination.ChaosCard = type;
        nomination.GuestCardAppliedBySessionId = guestSessionId;
        await db.SaveChangesAsync();

        var dto = MapGuestNominationDto(nomination, guestSessionId);
        notifier.Broadcast("nomination_updated", new { nomination = dto }, guestAllowed: true);
        return dto;
    }

    public async Task<int> IncrementGuestHypeMeterAsync(string token, Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        return await wowService.IncrementHypeMeterAsync(nominationId);
    }

    private static GuestNominationDto MapGuestNominationDto(WinNomination n, string guestSessionId) => new()
    {
        Id = n.Id,
        NomineeMemberId = n.NomineeMemberId,
        NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
        NominatorDisplayName = n.TeamMember != null ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}" : (n.GuestName ?? "Guest"),
        Title = n.Title,
        Description = n.Description,
        VoteCount = n.Votes.Count,
        HasVoted = false,
        IsOwned = n.GuestSessionId == guestSessionId,
        CreatedAt = n.CreatedAt,
        PowerUp = n.PowerUp,
        ChaosCard = n.ChaosCard,
        HypeMeterCount = n.HypeMeterCount
    };

    public async Task<IReadOnlyList<object>> GetMembersAsync(string token)
    {
        var weekExists = await db.WinWeeks.AnyAsync(w => w.GuestToken == token);
        if (!weekExists)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        return await db.TeamMembers
            .Where(m => m.IsActive)
            .OrderBy(m => m.FirstName)
            .Select(m => new { id = m.Id, name = $"{m.FirstName} {m.LastName}" })
            .ToListAsync<object>();
    }

    private string GetBaseUrl()
    {
        var request = httpContextAccessor.HttpContext?.Request;
        if (request == null) return string.Empty;
        return $"{request.Scheme}://{request.Host}";
    }
}
