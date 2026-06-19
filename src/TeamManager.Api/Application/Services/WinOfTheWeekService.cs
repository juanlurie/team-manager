using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class WinOfTheWeekService(AppDbContext db, IServiceScopeFactory scopeFactory) : IWinOfTheWeekService
{
    private const int MaxNominationsPerPerson = 3;
    private const int MaxVotesPerPerson = 3;

    public async Task<WinWeekDto?> GetCurrentWeekAsync(Guid currentMemberId, Guid seriesId)
    {
        var week = await GetActiveWeekAsync(seriesId);
        if (week is null) return null;

        if (week.Status == WinWeekStatus.SuddenDeath &&
            week.SuddenDeathEndsAt.HasValue &&
            DateTimeOffset.UtcNow > week.SuddenDeathEndsAt.Value)
        {
            await CheckAndAutoCloseSuddenDeathAsync(week, force: true);
        }

        if (week.Status != WinWeekStatus.Closed &&
            week.HypeBattleEndsAt.HasValue &&
            DateTimeOffset.UtcNow > week.HypeBattleEndsAt.Value)
        {
            await ResolveHypeBattleAsync(week);
        }

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == week.Id)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var nominationIds = nominations.Select(n => n.Id).ToList();

        var userVoteNominationIds = await db.WinVotes
            .Where(v => v.TeamMemberId == currentMemberId && nominationIds.Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        var userNominationCount = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.TeamMemberId == currentMemberId && n.TeamMemberId != null);

        var userVoteCount = await db.WinVotes
            .CountAsync(v => v.TeamMemberId == currentMemberId && nominationIds.Contains(v.WinNominationId));

        // During sudden death, track votes only on tied nominations (old votes were cleared)
        int userSuddenDeathVoteCount = 0;
        if (week.Status == WinWeekStatus.SuddenDeath && !string.IsNullOrEmpty(week.TiedNominationIds))
        {
            var tiedForCount = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
            userSuddenDeathVoteCount = await db.WinVotes
                .CountAsync(v => v.TeamMemberId == currentMemberId && v.TeamMemberId != null && tiedForCount.Contains(v.WinNominationId));
        }

        var totalVotesCast = nominations.Sum(n => n.Votes.Count);
        var activeMemberCount = await db.TeamMembers.CountAsync(m => m.IsActive);

        WinNomination? winner = null;
        if (week.WinnerNominationId.HasValue)
        {
            winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId.Value);
        }

        return new WinWeekDto
        {
            Id = week.Id,
            SeriesId = week.WinSeriesId,
            SeriesName = week.Series?.Name ?? string.Empty,
            WeekStart = week.WeekStart,
            Status = week.Status.ToString(),
            WinnerNominationId = week.WinnerNominationId,
            WinnerTitle = winner?.Title,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            OpenedAt = week.OpenedAt,
            ClosedAt = week.ClosedAt,
            SuddenDeathEndsAt = week.SuddenDeathEndsAt,
            HypeBattleEndsAt = week.HypeBattleEndsAt,
            CurrentMemberId = currentMemberId,
            UserVotesRemaining = week.Status == WinWeekStatus.SuddenDeath ? Math.Max(0, 1 - userSuddenDeathVoteCount) : MaxVotesPerPerson - userVoteCount,
            UserNominationsRemaining = MaxNominationsPerPerson - userNominationCount,
            TotalVotesCast = totalVotesCast,
            ActiveMemberCount = activeMemberCount,
            ConnectedMemberCount = week.GuestToken != null ? WebSocketMiddleware.GetSessionCount(week.GuestToken) : 0,
            TiedNominationIds = week.TiedNominationIds != null
                ? JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? []
                : [],
            PowerUpsEnabled = week.Series?.PowerUpsEnabled ?? true,
            HideVoteCounts = week.Series?.HideVoteCounts ?? false,
            GuestToken = week.GuestToken,
            WinnerStory = week.WinnerStory,
            Nominations = nominations.Select(n => new WinNominationDto
            {
                Id = n.Id,
                WinWeekId = n.WinWeekId,
                TeamMemberId = n.TeamMemberId,
                TeamMemberName = n.TeamMember != null
                    ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
                    : (n.GuestName ?? "Guest"),
                IsGuestNomination = n.TeamMemberId == null,
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                Title = n.Title,
                Description = n.Description,
                CreatedAt = n.CreatedAt,
                VoteCount = n.Votes.Count,
                HasVoted = userVoteNominationIds.Contains(n.Id),
                PowerUp = n.PowerUp,
                ChaosCard = n.ChaosCard,
                HypeMeterCount = n.HypeMeterCount
            }).ToList()
        };
    }

    public async Task<WinNominationDto> CreateNominationAsync(Guid memberId, CreateNominationRequest request, Guid seriesId = default)
    {
        var week = seriesId != default
            ? await GetActiveWeekAsync(seriesId)
            : await db.WinWeeks.Include(w => w.Series).Where(w => w.Status == WinWeekStatus.Nominating || w.Status == WinWeekStatus.Voting).OrderByDescending(w => w.WeekStart).FirstOrDefaultAsync();
        if (week is null) throw new InvalidOperationException("No active week found.");

        if (week.Status != WinWeekStatus.Nominating && week.Status != WinWeekStatus.Voting)
            throw new InvalidOperationException("Nominations are not open for the current week.");

        var count = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.TeamMemberId == memberId && n.TeamMemberId != null);

        if (count >= MaxNominationsPerPerson)
            throw new InvalidOperationException($"You can only submit up to {MaxNominationsPerPerson} nominations per week.");

        var nomination = new WinNomination
        {
            WinWeekId = week.Id,
            TeamMemberId = memberId,
            NomineeMemberId = request.NomineeMemberId,
            Title = request.Title,
            Description = request.Description
        };

        db.WinNominations.Add(nomination);
        await db.SaveChangesAsync();

        await db.Entry(nomination).Reference(n => n.TeamMember).LoadAsync();
        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();

        return new WinNominationDto
        {
            Id = nomination.Id,
            WinWeekId = nomination.WinWeekId,
            TeamMemberId = nomination.TeamMemberId,
            TeamMemberName = nomination.TeamMember != null
                ? $"{nomination.TeamMember.FirstName} {nomination.TeamMember.LastName}"
                : (nomination.GuestName ?? "Guest"),
            IsGuestNomination = nomination.TeamMemberId == null,
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            Title = nomination.Title,
            Description = nomination.Description,
            CreatedAt = nomination.CreatedAt,
            VoteCount = 0,
            HasVoted = false,
            PowerUp = nomination.PowerUp,
            ChaosCard = nomination.ChaosCard,
            HypeMeterCount = nomination.HypeMeterCount
        };
    }

    public async Task<WinNominationDto> UpdateNominationAsync(Guid memberId, Guid nominationId, CreateNominationRequest request)
    {
        var nomination = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.TeamMemberId != memberId)
            throw new InvalidOperationException("You can only edit your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be edited before voting opens.");

        nomination.Title = request.Title;
        nomination.Description = request.Description;
        nomination.NomineeMemberId = request.NomineeMemberId;

        await db.SaveChangesAsync();

        return new WinNominationDto
        {
            Id = nomination.Id,
            WinWeekId = nomination.WinWeekId,
            TeamMemberId = nomination.TeamMemberId,
            TeamMemberName = nomination.TeamMember != null
                ? $"{nomination.TeamMember.FirstName} {nomination.TeamMember.LastName}"
                : (nomination.GuestName ?? "Guest"),
            IsGuestNomination = nomination.TeamMemberId == null,
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            Title = nomination.Title,
            Description = nomination.Description,
            CreatedAt = nomination.CreatedAt,
            VoteCount = nomination.Votes.Count,
            HasVoted = false,
            PowerUp = nomination.PowerUp,
            ChaosCard = nomination.ChaosCard,
            HypeMeterCount = nomination.HypeMeterCount
        };
    }

    public async Task<bool> DeleteNominationAsync(Guid memberId, Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.TeamMemberId == null || nomination.TeamMemberId != memberId)
            throw new InvalidOperationException("You can only delete your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be deleted before voting opens.");

        db.WinNominations.Remove(nomination);
        await db.SaveChangesAsync();

        return true;
    }

    public async Task<WinVoteDto> VoteAsync(Guid memberId, Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        var week = nomination.WinWeek;
        if (week.Status != WinWeekStatus.Voting && week.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Voting is not open for the current week.");

        if (week.Status == WinWeekStatus.SuddenDeath)
        {
            var tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds ?? "[]") ?? [];
            var alreadyVoted = await db.WinVotes
                .AnyAsync(v => v.TeamMemberId == memberId && tiedIds.Contains(v.WinNominationId));
            if (alreadyVoted)
                throw new InvalidOperationException("You have already cast your sudden death vote.");
        }
        else
        {
            var existingVote = await db.WinVotes
                .FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.TeamMemberId == memberId);
            if (existingVote is not null)
                throw new InvalidOperationException("You have already voted for this nomination.");

            var weekVoteCount = await db.WinVotes
                .CountAsync(v => v.TeamMemberId == memberId && v.TeamMemberId != null && v.WinNomination.WinWeekId == nomination.WinWeekId);
            if (weekVoteCount >= MaxVotesPerPerson)
                throw new InvalidOperationException($"You can only vote up to {MaxVotesPerPerson} times per week.");
        }

        var vote = new WinVote
        {
            WinNominationId = nominationId,
            TeamMemberId = memberId
        };

        db.WinVotes.Add(vote);
        await db.SaveChangesAsync();

        return new WinVoteDto
        {
            Id = vote.Id,
            WinNominationId = vote.WinNominationId,
            TeamMemberId = vote.TeamMemberId,
            VotedAt = vote.VotedAt
        };
    }

    public async Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId)
    {
        var vote = await db.WinVotes
            .FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.TeamMemberId == memberId && v.TeamMemberId != null);

        if (vote is null) return false;

        db.WinVotes.Remove(vote);
        await db.SaveChangesAsync();

        return true;
    }

    public async Task<WinWeekDto> CloseWeekAsync(Guid memberId, Guid seriesId, CloseWeekRequest request)
    {
        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .Where(w => w.WinSeriesId == seriesId && (w.Status == WinWeekStatus.Voting || w.Status == WinWeekStatus.SuddenDeath))
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No active voting week found to close.");

        var nomination = week.Nominations.FirstOrDefault(n => n.Id == request.WinnerNominationId);
        if (nomination is null)
            throw new KeyNotFoundException("The specified nomination does not belong to the current week.");

        week.Status = WinWeekStatus.Closed;
        week.WinnerNominationId = request.WinnerNominationId;
        week.ClosedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();

        // Award weekly achievement to the winner
        await AwardWeeklyAchievementAsync(nomination.NomineeMemberId, week.WeekStart);

        // Grant bonus token to whoever nominated the winner
        if (nomination.TeamMemberId.HasValue)
            await GrantBonusTokenAsync(nomination.TeamMemberId.Value, week.Id);

        // Load nominee name for story generation
        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();
        var winnerName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}";
        EnqueueAndGenerateWinStory(week.Id, winnerName, nomination.Title, nomination.Description);

        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> OpenNextWeekAsync(Guid memberId, Guid seriesId)
    {
        var latestWeek = await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        DateOnly weekStart;
        if (latestWeek is not null)
        {
            if (latestWeek.Status != WinWeekStatus.Closed)
                throw new InvalidOperationException("Cannot open a new week while the current week is still active. Close it first.");

            weekStart = latestWeek.WeekStart.AddDays(7);
        }
        else
        {
            var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
            weekStart = GetWeekStart(today);
        }

        var existing = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.WinSeriesId == seriesId && w.WeekStart == weekStart);

        if (existing is not null)
            throw new InvalidOperationException("A week already exists for this period.");

        // Carry the guest token forward so existing share links keep working
        var carryToken = latestWeek?.GuestToken;
        if (carryToken != null) latestWeek!.GuestToken = null;

        var week = new WinWeek
        {
            WeekStart = weekStart,
            WeekEnd = weekStart.AddDays(6),
            Status = WinWeekStatus.Nominating,
            CreatedByMemberId = memberId,
            WinSeriesId = seriesId,
            GuestToken = carryToken
        };

        db.WinWeeks.Add(week);
        await db.SaveChangesAsync();

        await GrantWeeklyTokensAsync(week.Id);

        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> OpenVotingAsync(Guid memberId, Guid seriesId)
    {
        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .Where(w => w.WinSeriesId == seriesId && w.Status == WinWeekStatus.Nominating)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No nominating week found for this series.");

        if (week.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Voting can only be opened during the nominating phase.");

        if (week.Nominations.Count == 0)
            throw new InvalidOperationException("Cannot open voting with no nominations.");

        week.Status = WinWeekStatus.Voting;
        await db.SaveChangesAsync();

        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> ReopenNominationsAsync(Guid memberId, Guid seriesId)
    {
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && (w.Status == WinWeekStatus.Voting || w.Status == WinWeekStatus.SuddenDeath))
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No active week found.");

        if (week.Status != WinWeekStatus.Voting && week.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Nominations can only be reopened from the Voting or Tie-Breaker phase.");

        week.Status = WinWeekStatus.Nominating;
        week.TiedNominationIds = null;
        week.SuddenDeathEndsAt = null;

        var nominationIds = await db.WinNominations
            .Where(n => n.WinWeekId == week.Id)
            .Select(n => n.Id)
            .ToListAsync();
        var votes = await db.WinVotes
            .Where(v => nominationIds.Contains(v.WinNominationId))
            .ToListAsync();
        db.WinVotes.RemoveRange(votes);

        await db.SaveChangesAsync();

        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> StartSuddenDeathAsync(Guid memberId, Guid seriesId, StartSuddenDeathRequest request)
    {
        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .Where(w => w.WinSeriesId == seriesId && w.Status == WinWeekStatus.Voting)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No week found for the current period.");

        if (week.Status != WinWeekStatus.Voting)
            throw new InvalidOperationException("Sudden death can only be started during voting phase.");

        if (request.TiedNominationIds.Count < 2)
            throw new InvalidOperationException("Sudden death requires at least 2 tied nominations.");

        var tiedIds = request.TiedNominationIds.ToHashSet();
        var validNominations = week.Nominations.Where(n => tiedIds.Contains(n.Id)).ToList();
        if (validNominations.Count != request.TiedNominationIds.Count)
            throw new InvalidOperationException("One or more tied nominations do not belong to the current week.");

        // Clear all votes on tied nominations so sudden death starts fresh
        var votesToClear = db.WinVotes.Where(v => tiedIds.Contains(v.WinNominationId));
        db.WinVotes.RemoveRange(votesToClear);

        week.Status = WinWeekStatus.SuddenDeath;
        week.TiedNominationIds = JsonSerializer.Serialize(request.TiedNominationIds);
        week.SuddenDeathEndsAt = DateTimeOffset.UtcNow.AddSeconds(request.DurationSeconds ?? 90);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("sudden_death_started", new
        {
            weekId = week.Id,
            endsAt = week.SuddenDeathEndsAt,
            tiedNominationIds = request.TiedNominationIds
        }, guestAllowed: true);

        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<IReadOnlyList<WinWeekHistoryDto>> GetHistoryAsync(Guid seriesId, int? year = null, int limit = 52)
    {
        var query = db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && w.Status == WinWeekStatus.Closed && w.WinnerNominationId.HasValue)
            .AsQueryable();

        if (year.HasValue)
            query = query.Where(w => w.WeekStart.Year == year.Value);

        var weeks = await query
            .OrderByDescending(w => w.WeekStart)
            .Take(limit)
            .ToListAsync();

        var winnerIds = weeks.Where(w => w.WinnerNominationId.HasValue).Select(w => w.WinnerNominationId!.Value).ToList();
        if (winnerIds.Count == 0) return [];

        var winners = await db.WinNominations
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => winnerIds.Contains(n.Id))
            .ToListAsync();

        var winnerLookup = winners.ToDictionary(w => w.Id);

        return weeks.Select(week =>
        {
            var winner = week.WinnerNominationId.HasValue && winnerLookup.TryGetValue(week.WinnerNominationId.Value, out var w) ? w : null;
            return new WinWeekHistoryDto
            {
                Id = week.Id,
                WeekStart = week.WeekStart,
                WeekEnd = week.WeekEnd,
                WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
                WinnerTitle = winner?.Title,
                WinnerDescription = winner?.Description,
                WinnerVoteCount = winner?.Votes.Count ?? 0,
                ClosedAt = week.ClosedAt ?? DateTimeOffset.UtcNow
            };
        }).ToList();
    }

    public async Task<WinWeekDetailDto> GetWeekDetailAsync(Guid weekId, Guid memberId)
    {
        var week = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.Id == weekId);

        if (week is null)
            throw new KeyNotFoundException("Week not found.");

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == weekId)
            .OrderByDescending(n => n.Votes.Count)
            .ToListAsync();

        var userVoteIds = await db.WinVotes
            .Where(v => v.TeamMemberId == memberId && nominations.Select(n => n.Id).Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        var winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId);

        return new WinWeekDetailDto
        {
            Id = week.Id,
            WeekStart = week.WeekStart,
            WeekEnd = week.WeekEnd,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            WinnerTitle = winner?.Title,
            AllNominations = nominations.Select(n => new WinNominationDto
            {
                Id = n.Id,
                WinWeekId = n.WinWeekId,
                TeamMemberId = n.TeamMemberId,
                TeamMemberName = n.TeamMember != null
                    ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
                    : (n.GuestName ?? "Guest"),
                IsGuestNomination = n.TeamMemberId == null,
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                Title = n.Title,
                Description = n.Description,
                CreatedAt = n.CreatedAt,
                VoteCount = n.Votes.Count,
                HasVoted = userVoteIds.Contains(n.Id),
                PowerUp = n.PowerUp,
                ChaosCard = n.ChaosCard,
                HypeMeterCount = n.HypeMeterCount
            }).ToList()
        };
    }

    private async Task AwardWeeklyAchievementAsync(Guid winnerMemberId, DateOnly weekStart)
    {
        var achievement = await db.Achievements
            .FirstOrDefaultAsync(a => a.Key == "win-of-the-week");

        if (achievement is null) return;

        var monthLabel = weekStart.ToString("MMMM yyyy");
        var alreadyAwarded = await db.MemberAchievements
            .AnyAsync(ma => ma.TeamMemberId == winnerMemberId
                         && ma.AchievementId == achievement.Id
                         && ma.Note == monthLabel);

        if (alreadyAwarded) return;

        db.MemberAchievements.Add(new MemberAchievement
        {
            TeamMemberId = winnerMemberId,
            AchievementId = achievement.Id,
            AwardedAt = DateTimeOffset.UtcNow,
            Note = monthLabel
        });

        db.PointAwards.Add(new PointAward
        {
            TeamMemberId = winnerMemberId,
            Points = achievement.Points,
            Reason = $"Win of the Week Champion — {monthLabel}",
            AwardedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
    }

    private async Task<WinWeek?> GetActiveWeekAsync(Guid seriesId)
    {
        return await db.WinWeeks
            .Include(w => w.Series)
            .Where(w => w.WinSeriesId == seriesId)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();
    }

    private static DateOnly GetWeekStart(DateOnly date)
    {
        var diff = (7 + (int)date.DayOfWeek - (int)DayOfWeek.Monday) % 7;
        return date.AddDays(-diff);
    }

    private void EnqueueAndGenerateWinStory(Guid weekId, string winnerName, string title, string? description)
    {
        _ = Task.Run(async () =>
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var bgDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            try
            {
                var config = await bgDb.ApiRequestConfigs
                    .FirstOrDefaultAsync(c => c.Action == "AiChatWinStory" && c.Enabled);
                if (config is null) return;

                var parameters = string.IsNullOrWhiteSpace(config.ParametersJson)
                    ? new Dictionary<string, string>()
                    : JsonSerializer.Deserialize<Dictionary<string, string>>(config.ParametersJson) ?? new();
                var headers = string.IsNullOrWhiteSpace(config.HeadersJson)
                    ? new Dictionary<string, string>()
                    : JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new();
                var mappingOpts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var mapping = string.IsNullOrWhiteSpace(config.MappingJson)
                    ? new MappingConfigDto()
                    : JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson, mappingOpts) ?? new();
                var textPath = mapping.TextResponsePath;

                var vars = new Dictionary<string, string>
                {
                    ["nominee"] = winnerName,
                    ["title"] = title,
                    ["description"] = description ?? ""
                };

                // Storage: non-secret values only — stored URL/body/headers are safe to return to clients
                var publicConfigVars = await ConfigVariableResolver.LoadPublicAsync(bgDb);
                var allConfigVars = await ConfigVariableResolver.LoadAsync(bgDb);

                string ResolveForStorage(string template)
                {
                    var result = ConfigVariableResolver.Apply(template, publicConfigVars);
                    foreach (var (k, v) in parameters)
                        result = result.Replace($"{{{k}}}", v);
                    foreach (var (k, v) in vars)
                        result = result.Replace($"{{{k}}}", v);
                    return result;
                }

                // Execution: all values including secrets — used only for the HTTP call, never stored
                string ResolveForExecution(string template)
                {
                    var result = ConfigVariableResolver.Apply(template, allConfigVars);
                    foreach (var (k, v) in parameters)
                        result = result.Replace($"{{{k}}}", v);
                    foreach (var (k, v) in vars)
                        result = result.Replace($"{{{k}}}", v);
                    return result;
                }

                var evt = new ApiSyncEvent
                {
                    Action = "AiChatWinStory",
                    ConfigName = config.Name,
                    Label = $"Win Story — {winnerName}",
                    SourceType = "WinWeek",
                    SourceId = weekId.ToString(),
                    HttpMethod = "POST",
                    ResolvedUrl = ResolveForStorage(config.Url),
                    ResolvedHeadersJson = JsonSerializer.Serialize(headers.ToDictionary(kvp => kvp.Key, kvp => ResolveForStorage(kvp.Value))),
                    ResolvedBody = ResolveForStorage(config.BodyTemplate ?? ""),
                    BodyFormat = config.BodyFormat ?? "json"
                };
                bgDb.ApiSyncEvents.Add(evt);
                await bgDb.SaveChangesAsync();

                // Execute immediately using fully resolved values (secrets applied here, not stored)
                var executionHeaders = headers.ToDictionary(kvp => kvp.Key, kvp => ResolveForExecution(kvp.Value));
                var executionUrl = ResolveForExecution(config.Url);
                var executionBody = ResolveForExecution(config.BodyTemplate ?? "");

                try
                {
                    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                    foreach (var (k, v) in executionHeaders)
                        client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

                    var mediaType = (config.BodyFormat ?? "json") == "urlencoded"
                        ? "application/x-www-form-urlencoded"
                        : "application/json";
                    var response = await client.PostAsync(executionUrl, new StringContent(executionBody, Encoding.UTF8, mediaType));
                    var responseBody = await response.Content.ReadAsStringAsync();

                    evt.ResponseStatus = (int)response.StatusCode;
                    evt.ResponseBody = responseBody;
                    evt.SentAt = DateTimeOffset.UtcNow;

                    if (response.IsSuccessStatusCode)
                    {
                        evt.Status = "sent";
                        var story = ExtractTextAtPath(responseBody, textPath);
                        if (!string.IsNullOrWhiteSpace(story))
                        {
                            var winWeek = await bgDb.WinWeeks.FindAsync(weekId);
                            if (winWeek is not null)
                            {
                                winWeek.WinnerStory = story.Trim();
                                await bgDb.SaveChangesAsync();
                                _ = WebSocketMiddleware.BroadcastAsync("win_story_ready", new { weekId }, guestAllowed: true);
                            }
                        }
                    }
                    else
                    {
                        evt.Status = "failed";
                    }
                }
                catch (Exception ex)
                {
                    evt.Status = "failed";
                    evt.ResponseBody = ex.Message;
                    evt.SentAt = DateTimeOffset.UtcNow;
                }

                await bgDb.SaveChangesAsync();
            }
            catch { /* best-effort */ }
        });
    }

    public async Task<int> GetTokenBalanceAsync(Guid memberId, Guid seriesId)
    {
        var week = await GetActiveWeekAsync(seriesId);
        if (week is null) return 0;

        await EnsureWeeklyTokenAsync(memberId, week.Id);

        return await db.WowMemberTokens
            .CountAsync(t => t.TeamMemberId == memberId && t.WinWeekId == week.Id && t.SpentAt == null);
    }

    public async Task<WinNominationDto> ApplyPowerUpAsync(Guid memberId, Guid nominationId, string type)
    {
        var validPowerUps = new HashSet<string> { "Spotlight" };
        if (!validPowerUps.Contains(type))
            throw new InvalidOperationException($"Invalid power-up type: {type}");

        var nomination = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting && nomination.WinWeek.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Power-ups can only be applied during voting.");

        if (nomination.PowerUp is not null)
            throw new InvalidOperationException("A power-up has already been applied to this nomination.");

        await SpendTokenAsync(memberId, nomination.WinWeekId, nominationId);

        nomination.PowerUp = type;
        await db.SaveChangesAsync();

        return MapNominationDto(nomination, false);
    }

    public async Task<WinNominationDto> ApplyChaosCardAsync(Guid memberId, Guid nominationId, string type)
    {
        var validCards = new HashSet<string> { "TinyText", "Autocorrect", "RandomCase", "Hangman" };
        if (!validCards.Contains(type))
            throw new InvalidOperationException($"Invalid chaos card type: {type}");

        var nomination = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting && nomination.WinWeek.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Chaos cards can only be applied during voting.");

        if (nomination.ChaosCard is not null)
            throw new InvalidOperationException("A chaos card has already been applied to this nomination.");

        await SpendTokenAsync(memberId, nomination.WinWeekId, nominationId);

        nomination.ChaosCard = type;
        await db.SaveChangesAsync();

        return MapNominationDto(nomination, false);
    }

    public async Task<int> IncrementHypeMeterAsync(Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting && nomination.WinWeek.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Hype meter is only active during voting.");

        nomination.HypeMeterCount++;
        await db.SaveChangesAsync();

        return nomination.HypeMeterCount;
    }

    private WinNominationDto MapNominationDto(WinNomination n, bool hasVoted) => new()
    {
        Id = n.Id,
        WinWeekId = n.WinWeekId,
        TeamMemberId = n.TeamMemberId,
        TeamMemberName = n.TeamMember != null
            ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
            : (n.GuestName ?? "Guest"),
        IsGuestNomination = n.TeamMemberId == null,
        NomineeMemberId = n.NomineeMemberId,
        NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
        Title = n.Title,
        Description = n.Description,
        CreatedAt = n.CreatedAt,
        VoteCount = n.Votes.Count,
        HasVoted = hasVoted,
        PowerUp = n.PowerUp,
        ChaosCard = n.ChaosCard,
        HypeMeterCount = n.HypeMeterCount
    };

    private async Task SpendTokenAsync(Guid memberId, Guid winWeekId, Guid nominationId)
    {
        await EnsureWeeklyTokenAsync(memberId, winWeekId);

        var token = await db.WowMemberTokens
            .FirstOrDefaultAsync(t => t.TeamMemberId == memberId && t.WinWeekId == winWeekId && t.SpentAt == null);

        if (token is null)
            throw new InvalidOperationException("You don't have any tokens available this week.");

        token.SpentAt = DateTimeOffset.UtcNow;
        token.SpentOnNominationId = nominationId;
        await db.SaveChangesAsync();
    }

    private async Task EnsureWeeklyTokenAsync(Guid memberId, Guid winWeekId)
    {
        var alreadyGranted = await db.WowMemberTokens
            .AnyAsync(t => t.TeamMemberId == memberId && t.WinWeekId == winWeekId && t.Source == "Weekly");

        if (!alreadyGranted)
        {
            db.WowMemberTokens.Add(new WowMemberToken
            {
                TeamMemberId = memberId,
                WinWeekId = winWeekId,
                Source = "Weekly"
            });
            await db.SaveChangesAsync();
        }
    }

    private async Task GrantWeeklyTokensAsync(Guid winWeekId)
    {
        var activeMembers = await db.TeamMembers
            .Where(m => m.IsActive)
            .Select(m => m.Id)
            .ToListAsync();

        var tokens = activeMembers.Select(memberId => new WowMemberToken
        {
            TeamMemberId = memberId,
            WinWeekId = winWeekId,
            Source = "Weekly"
        });

        db.WowMemberTokens.AddRange(tokens);
        await db.SaveChangesAsync();
    }

    private async Task GrantBonusTokenAsync(Guid memberId, Guid winWeekId)
    {
        db.WowMemberTokens.Add(new WowMemberToken
        {
            TeamMemberId = memberId,
            WinWeekId = winWeekId,
            Source = "WinnerBonus"
        });
        await db.SaveChangesAsync();
    }

    internal static string? ExtractTextAtPath(string json, string dotPath)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var current = doc.RootElement;
            foreach (var seg in dotPath.Split('.'))
            {
                if (int.TryParse(seg, out var idx))
                    current = current[idx];
                else if (current.TryGetProperty(seg, out var next))
                    current = next;
                else return null;
            }
            return current.ValueKind == JsonValueKind.String ? current.GetString() : null;
        }
        catch { return null; }
    }

    public async Task AutoCloseExpiredSuddenDeathAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId);
        if (week is null || week.Status != WinWeekStatus.SuddenDeath) return;
        await CheckAndAutoCloseSuddenDeathAsync(week, force: true);
    }

    public async Task AutoResolveExpiredHypeBattleAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId);
        if (week is null || week.Status == WinWeekStatus.Closed) return;
        await ResolveHypeBattleAsync(week);
    }

    private async Task ResolveHypeBattleAsync(WinWeek week)
    {
        week.HypeBattleEndsAt = null;

        List<Guid> tiedIds;
        if (!string.IsNullOrEmpty(week.TiedNominationIds))
        {
            tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
        }
        else
        {
            // Tie detected during Voting, before Sudden Death was started -- recompute from current votes.
            var voteCounts = await db.WinNominations
                .Where(n => n.WinWeekId == week.Id)
                .Select(n => new { n.Id, VoteCount = n.Votes.Count })
                .ToListAsync();
            var topCount = voteCounts.Count > 0 ? voteCounts.Max(v => v.VoteCount) : 0;
            tiedIds = topCount > 0
                ? voteCounts.Where(v => v.VoteCount == topCount).Select(v => v.Id).ToList()
                : [];
        }

        if (tiedIds.Count < 2)
        {
            await db.SaveChangesAsync();
            return;
        }

        // A clear vote leader among the tied nominations wins outright -- hype only breaks a continuing tie.
        var votes = await db.WinVotes
            .Where(v => tiedIds.Contains(v.WinNominationId))
            .GroupBy(v => v.WinNominationId)
            .Select(g => new { NominationId = g.Key, VoteCount = g.Count() })
            .ToListAsync();

        var maxVotes = votes.Count > 0 ? votes.Max(v => v.VoteCount) : 0;
        var voteLeaders = votes.Where(v => v.VoteCount == maxVotes).Select(v => v.NominationId).ToList();

        Guid winnerId;
        if (voteLeaders.Count == 1)
        {
            winnerId = voteLeaders[0];
        }
        else
        {
            var hypeCounts = await db.WinNominations
                .Where(n => tiedIds.Contains(n.Id))
                .Select(n => new { n.Id, n.HypeMeterCount })
                .ToListAsync();

            var maxHype = hypeCounts.Count > 0 ? hypeCounts.Max(h => h.HypeMeterCount) : 0;
            var hypeLeaders = hypeCounts.Where(h => h.HypeMeterCount == maxHype).Select(h => h.Id).ToList();

            winnerId = hypeLeaders.Count > 0
                ? hypeLeaders[Random.Shared.Next(hypeLeaders.Count)]
                : tiedIds[Random.Shared.Next(tiedIds.Count)];
        }

        week.Status = WinWeekStatus.Closed;
        week.WinnerNominationId = winnerId;
        week.ClosedAt = DateTimeOffset.UtcNow;
        week.TiedNominationIds = null;
        week.SuddenDeathEndsAt = null;
        await db.SaveChangesAsync();

        var winnerNom = await db.WinNominations
            .Include(n => n.Nominee)
            .FirstAsync(n => n.Id == week.WinnerNominationId!.Value);

        await AwardWeeklyAchievementAsync(winnerNom.NomineeMemberId, week.WeekStart);
        if (winnerNom.TeamMemberId.HasValue)
            await GrantBonusTokenAsync(winnerNom.TeamMemberId.Value, week.Id);

        EnqueueAndGenerateWinStory(week.Id, $"{winnerNom.Nominee.FirstName} {winnerNom.Nominee.LastName}", winnerNom.Title, winnerNom.Description);

        _ = WebSocketMiddleware.BroadcastAsync("voting_closed", new
        {
            weekId = week.Id,
            winnerId = week.WinnerNominationId
        }, guestAllowed: true);
    }

    private async Task CheckAndAutoCloseSuddenDeathAsync(WinWeek week, bool force = false)
    {
        if (string.IsNullOrEmpty(week.TiedNominationIds)) return;

        var tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
        if (tiedIds.Count == 0) return;

        var votes = await db.WinVotes
            .Where(v => tiedIds.Contains(v.WinNominationId))
            .GroupBy(v => v.WinNominationId)
            .Select(g => new { NominationId = g.Key, VoteCount = g.Count() })
            .ToListAsync();

        var maxVotes = votes.Count > 0 ? votes.Max(v => v.VoteCount) : 0;
        var leaders = votes.Where(v => v.VoteCount == maxVotes).ToList();

        // Only a clear single leader counts as a real winner; anything else needs force
        if (leaders.Count != 1 && !force) return;

        // Pick winner: clear leader wins outright; ties or no votes get a random pick
        Guid winnerId;
        if (leaders.Count == 1)
            winnerId = leaders[0].NominationId;
        else if (leaders.Count > 1)
            winnerId = leaders[Random.Shared.Next(leaders.Count)].NominationId;
        else
            winnerId = tiedIds[Random.Shared.Next(tiedIds.Count)];

        week.Status = WinWeekStatus.Closed;
        week.WinnerNominationId = winnerId;
        week.ClosedAt = DateTimeOffset.UtcNow;
        week.TiedNominationIds = null;
        week.SuddenDeathEndsAt = null;
        await db.SaveChangesAsync();

        var winnerNom = await db.WinNominations
            .Include(n => n.Nominee)
            .FirstAsync(n => n.Id == week.WinnerNominationId!.Value);

        await AwardWeeklyAchievementAsync(winnerNom.NomineeMemberId, week.WeekStart);
        if (winnerNom.TeamMemberId.HasValue)
            await GrantBonusTokenAsync(winnerNom.TeamMemberId.Value, week.Id);

        EnqueueAndGenerateWinStory(week.Id, $"{winnerNom.Nominee.FirstName} {winnerNom.Nominee.LastName}", winnerNom.Title, winnerNom.Description);

        _ = WebSocketMiddleware.BroadcastAsync("voting_closed", new
        {
            weekId = week.Id,
            winnerId = week.WinnerNominationId
        }, guestAllowed: true);
    }
}
