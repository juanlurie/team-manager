using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Wordle;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WordleRoyaleService(AppDbContext db)
{
    private const int KFactor = 32;
    private const int DefaultElo = 1200;

    // Called by WordleService when a session completes. Creates H2H match records for every
    // pair of participants who reached a terminal state, then updates each member's ELO rating.
    public async Task ProcessSessionAsync(WordleSession session, List<WordleParticipant> participants)
    {
        var finishers = participants
            .Where(p => p.Status != WordleParticipantStatus.Playing)
            .OrderBy(p => p.MemberId)
            .ToList();

        if (finishers.Count == 0) return;

        var memberIds = finishers.Select(p => p.MemberId).ToList();
        var ratings = await db.WordleRoyaleRatings
            .Where(r => memberIds.Contains(r.MemberId))
            .ToDictionaryAsync(r => r.MemberId);

        // Ensure every finisher has a rating row (even in solo sessions — they show on the standings)
        foreach (var p in finishers)
        {
            if (!ratings.ContainsKey(p.MemberId))
            {
                var rating = new WordleRoyaleRating { MemberId = p.MemberId };
                db.WordleRoyaleRatings.Add(rating);
                ratings[p.MemberId] = rating;
            }
        }

        var now = DateTimeOffset.UtcNow;
        var isoWeek = ISOWeek.GetWeekOfYear(now.UtcDateTime);
        var isoYear = ISOWeek.GetYear(now.UtcDateTime);

        // Accumulate ELO changes per member across all pairs so we can update ratings in one pass
        var eloDeltas = finishers.ToDictionary(p => p.MemberId, _ => 0);
        var matchWins = finishers.ToDictionary(p => p.MemberId, _ => 0);
        var matchLosses = finishers.ToDictionary(p => p.MemberId, _ => 0);
        var matchDraws = finishers.ToDictionary(p => p.MemberId, _ => 0);

        for (var i = 0; i < finishers.Count; i++)
        {
            for (var j = i + 1; j < finishers.Count; j++)
            {
                var p1 = finishers[i];
                var p2 = finishers[j];

                var (actual1, actual2) = GetOutcome(p1, p2);
                var elo1 = ratings[p1.MemberId].Elo + eloDeltas[p1.MemberId];
                var elo2 = ratings[p2.MemberId].Elo + eloDeltas[p2.MemberId];

                var expected1 = 1.0 / (1.0 + Math.Pow(10, (elo2 - elo1) / 400.0));
                var expected2 = 1.0 - expected1;

                var change1 = (int)Math.Round(KFactor * (actual1 - expected1));
                var change2 = (int)Math.Round(KFactor * (actual2 - expected2));

                eloDeltas[p1.MemberId] += change1;
                eloDeltas[p2.MemberId] += change2;

                if (actual1 > actual2) { matchWins[p1.MemberId]++; matchLosses[p2.MemberId]++; }
                else if (actual2 > actual1) { matchWins[p2.MemberId]++; matchLosses[p1.MemberId]++; }
                else { matchDraws[p1.MemberId]++; matchDraws[p2.MemberId]++; }

                Guid? winnerId = actual1 > actual2 ? p1.MemberId : actual2 > actual1 ? p2.MemberId : null;

                db.WordleRoyaleMatches.Add(new WordleRoyaleMatch
                {
                    SessionId = session.Id,
                    Player1Id = p1.MemberId,
                    Player2Id = p2.MemberId,
                    WinnerId = winnerId,
                    Player1Guesses = p1.GuessCount,
                    Player2Guesses = p2.GuessCount,
                    Player1Won = p1.Status == WordleParticipantStatus.Won,
                    Player2Won = p2.Status == WordleParticipantStatus.Won,
                    Player1EloChange = change1,
                    Player2EloChange = change2,
                    Player1EloAfter = elo1 + change1,
                    Player2EloAfter = elo2 + change2,
                    IsoWeek = isoWeek,
                    Year = isoYear,
                    PlayedAt = now
                });
            }
        }

        // Apply all deltas to ratings and update win streaks
        foreach (var p in finishers)
        {
            var rating = ratings[p.MemberId];
            rating.Elo = Math.Max(100, rating.Elo + eloDeltas[p.MemberId]);
            rating.Wins += matchWins[p.MemberId];
            rating.Losses += matchLosses[p.MemberId];
            rating.Draws += matchDraws[p.MemberId];

            if (p.Status == WordleParticipantStatus.Won)
            {
                rating.WinStreak++;
                if (rating.WinStreak > rating.BestStreak)
                    rating.BestStreak = rating.WinStreak;
            }
            else
            {
                rating.WinStreak = 0;
            }

            rating.LastUpdatedAt = now;
        }

        await db.SaveChangesAsync();
    }

    public async Task<List<RoyaleStandingDto>> GetStandingsAsync()
    {
        var ratings = await db.WordleRoyaleRatings
            .Include(r => r.Member)
            .Where(r => r.Member != null && r.Member.IsActive)
            .OrderByDescending(r => r.Elo)
            .ThenBy(r => r.Member!.LastName)
            .ToListAsync();

        var fullNames = ratings.Select(r => r.Member != null ? $"{r.Member.FirstName} {r.Member.LastName}" : "Unknown").ToArray();
        var displayNames = GameNameHelper.DeduplicateFirstNames(fullNames);

        return ratings.Select((r, i) => new RoyaleStandingDto
        {
            Rank = i + 1,
            MemberId = r.MemberId,
            MemberName = displayNames[i],
            Elo = r.Elo,
            WinStreak = r.WinStreak,
            BestStreak = r.BestStreak,
            Wins = r.Wins,
            Losses = r.Losses,
            Draws = r.Draws
        }).ToList();
    }

    public async Task<WeeklyRoyaleDto> GetWeeklyMatchesAsync(int? isoWeek = null, int? year = null)
    {
        var now = DateTimeOffset.UtcNow;
        var week = isoWeek ?? ISOWeek.GetWeekOfYear(now.UtcDateTime);
        var yr = year ?? ISOWeek.GetYear(now.UtcDateTime);

        var matches = await db.WordleRoyaleMatches
            .Include(m => m.Player1)
            .Include(m => m.Player2)
            .Where(m => m.IsoWeek == week && m.Year == yr)
            .OrderByDescending(m => m.PlayedAt)
            .ToListAsync();

        return new WeeklyRoyaleDto
        {
            IsoWeek = week,
            Year = yr,
            Matches = matches.Select(ToDto).ToList()
        };
    }

    public async Task<MyRoyaleResultDto?> GetSessionResultForMemberAsync(Guid sessionId, Guid memberId)
    {
        var matches = await db.WordleRoyaleMatches
            .Where(m => m.SessionId == sessionId && (m.Player1Id == memberId || m.Player2Id == memberId))
            .ToListAsync();

        if (matches.Count == 0) return null;

        var totalChange = matches.Sum(m => m.Player1Id == memberId ? m.Player1EloChange : m.Player2EloChange);
        var eloAfter = matches.Max(m => m.Player1Id == memberId ? m.Player1EloAfter : m.Player2EloAfter);
        var mw = matches.Count(m => m.WinnerId == memberId);
        var ml = matches.Count(m => m.WinnerId.HasValue && m.WinnerId != memberId);
        var md = matches.Count(m => !m.WinnerId.HasValue);

        var rating = await db.WordleRoyaleRatings.FindAsync(memberId);

        return new MyRoyaleResultDto
        {
            EloChange = totalChange,
            EloAfter = eloAfter,
            WinStreak = rating?.WinStreak ?? 0,
            MatchesWon = mw,
            MatchesLost = ml,
            MatchesDrawn = md
        };
    }

    private static (double actual1, double actual2) GetOutcome(WordleParticipant p1, WordleParticipant p2)
    {
        // Both won: fewer guesses = win
        if (p1.Status == WordleParticipantStatus.Won && p2.Status == WordleParticipantStatus.Won)
        {
            if (p1.GuessCount < p2.GuessCount) return (1.0, 0.0);
            if (p1.GuessCount > p2.GuessCount) return (0.0, 1.0);
            return (0.5, 0.5);
        }
        // One won, one lost
        if (p1.Status == WordleParticipantStatus.Won) return (1.0, 0.0);
        if (p2.Status == WordleParticipantStatus.Won) return (0.0, 1.0);
        // Both lost: draw
        return (0.5, 0.5);
    }

    private static RoyaleMatchDto ToDto(WordleRoyaleMatch m)
    {
        var names = GameNameHelper.DeduplicateFirstNames([
            m.Player1 != null ? $"{m.Player1.FirstName} {m.Player1.LastName}" : "Unknown",
            m.Player2 != null ? $"{m.Player2.FirstName} {m.Player2.LastName}" : "Unknown",
        ]);
        return new()
        {
            Id = m.Id,
            SessionId = m.SessionId,
            Player1Id = m.Player1Id,
            Player1Name = names[0],
            Player2Id = m.Player2Id,
            Player2Name = names[1],
            WinnerId = m.WinnerId,
            Player1Guesses = m.Player1Guesses,
            Player2Guesses = m.Player2Guesses,
            Player1Won = m.Player1Won,
            Player2Won = m.Player2Won,
            Player1EloChange = m.Player1EloChange,
            Player2EloChange = m.Player2EloChange,
            Player1EloAfter = m.Player1EloAfter,
            Player2EloAfter = m.Player2EloAfter,
            PlayedAt = m.PlayedAt
        };
    }
}
