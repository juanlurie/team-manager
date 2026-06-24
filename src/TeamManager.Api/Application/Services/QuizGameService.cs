using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.QuizGame;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class QuizGameService(AppDbContext db, QuizQuestionGeneratorService questionGenerator)
{
    private const int QuestionDurationSeconds = 20;
    private const int RevealDisplaySeconds = 4;
    private const int PointsPerCorrectAnswer = 10;
    private const int MillionaireQuestionDurationSeconds = 30;

    public async Task<List<QuizGameSessionSummaryDto>> GetOpenSessionsAsync()
    {
        var sessions = await db.QuizGameSessions
            .Include(s => s.CreatedByMember)
            .Include(s => s.Participants)
            .Where(s => s.Status != QuizGameSessionStatus.Completed)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return sessions.Select(s => new QuizGameSessionSummaryDto
        {
            Id = s.Id,
            Title = s.Title,
            Status = s.Status.ToString(),
            GameMode = s.GameMode.ToString(),
            QuestionCount = s.QuestionCount,
            CreatedByName = s.CreatedByMember != null ? $"{s.CreatedByMember.FirstName} {s.CreatedByMember.LastName}" : "Someone",
            ParticipantCount = s.Participants.Count,
            CreatedAt = s.CreatedAt
        }).ToList();
    }

    public async Task<QuizGameSessionDto> CreateSessionAsync(Guid memberId, string? title, int questionCount, string gameMode = "Classic", int? difficultyLevel = null)
    {
        var mode = Enum.TryParse<QuizGameMode>(gameMode, true, out var parsedMode) ? parsedMode : QuizGameMode.Classic;
        var session = new QuizGameSession
        {
            CreatedByMemberId = memberId,
            Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim(),
            GameMode = mode,
            // Millionaire's question count is the fixed prize ladder length, not a user choice.
            QuestionCount = mode == QuizGameMode.Millionaire ? MillionaireLadder.RoundCount : Math.Clamp(questionCount, 3, 25),
            // Millionaire ignores this and escalates per-round via MillionaireLadder instead.
            DifficultyLevel = mode == QuizGameMode.Classic && difficultyLevel.HasValue ? Math.Clamp(difficultyLevel.Value, 1, 15) : null
        };
        db.QuizGameSessions.Add(session);
        await db.SaveChangesAsync();

        db.QuizGameParticipants.Add(new QuizGameParticipant { SessionId = session.Id, MemberId = memberId });
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_session_created", new { sessionId = session.Id });

        return await GetSessionAsync(session.Id, memberId);
    }

    public async Task<QuizGameSessionDto> JoinSessionAsync(Guid memberId, Guid sessionId)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.Status == QuizGameSessionStatus.Completed)
            throw new InvalidOperationException("This session has already finished.");

        var alreadyJoined = await db.QuizGameParticipants.AnyAsync(p => p.SessionId == sessionId && p.MemberId == memberId);
        if (!alreadyJoined)
        {
            db.QuizGameParticipants.Add(new QuizGameParticipant { SessionId = sessionId, MemberId = memberId });
            await db.SaveChangesAsync();
            _ = WebSocketMiddleware.BroadcastAsync("quiz_game_participant_joined", new { sessionId, memberId });
        }

        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<QuizGameSessionDto> StartSessionAsync(Guid memberId, Guid sessionId)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.CreatedByMemberId != memberId)
            throw new InvalidOperationException("Only the session creator can start it.");
        if (session.Status != QuizGameSessionStatus.Waiting)
            throw new InvalidOperationException("This session has already started.");

        if (session.GameMode == QuizGameMode.Millionaire)
        {
            // No shared current question to generate -- each participant starts their own run
            // via StartMillionaireRunAsync once the session is open.
            session.Status = QuizGameSessionStatus.InProgress;
            session.StartedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            _ = WebSocketMiddleware.BroadcastAsync("quiz_game_started", new { sessionId });
            return await GetSessionAsync(sessionId, memberId);
        }

        var (question, options, correctIndex, isAiGenerated) = await questionGenerator.GenerateAsync("QuizGame", "Quiz Game — question 1", session.DifficultyLevel);
        session.CurrentQuestionIndex = 0;
        session.CurrentQuestion = question;
        session.CurrentOptionsJson = JsonSerializer.Serialize(options);
        session.CurrentCorrectIndex = correctIndex;
        session.CurrentQuestionIsAiGenerated = isAiGenerated;
        session.CurrentQuestionEndsAt = DateTimeOffset.UtcNow.AddSeconds(QuestionDurationSeconds);
        session.Status = QuizGameSessionStatus.InProgress;
        session.StartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_started", new { sessionId });

        return await GetSessionAsync(sessionId, memberId);
    }

    // Begins this participant's own climb up the prize ladder. Independent of anyone else in
    // the session -- there's no "everyone starts together" step for Millionaire mode.
    public async Task<QuizGameSessionDto> StartMillionaireRunAsync(Guid memberId, Guid sessionId)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.GameMode != QuizGameMode.Millionaire)
            throw new InvalidOperationException("This session isn't a Millionaire game.");
        if (session.Status != QuizGameSessionStatus.InProgress)
            throw new InvalidOperationException("The session hasn't started yet.");

        var participant = await db.QuizGameParticipants.FirstOrDefaultAsync(p => p.SessionId == sessionId && p.MemberId == memberId)
            ?? throw new InvalidOperationException("Join the session before playing.");
        if (participant.MillionaireStatus != QuizMillionaireStatus.NotStarted)
            throw new InvalidOperationException("You've already started your run.");

        await GetOrCreateMillionaireRoundAsync(sessionId, 0);
        participant.MillionaireStatus = QuizMillionaireStatus.Playing;
        participant.MillionaireRoundIndex = 0;
        participant.MillionaireRoundEndsAt = await IsSoloMillionaireSessionAsync(sessionId)
            ? null
            : DateTimeOffset.UtcNow.AddSeconds(MillionaireQuestionDurationSeconds);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_millionaire_progress", new { sessionId, memberId });
        return await GetSessionAsync(sessionId, memberId);
    }

    // Submits an answer for the participant's current rung of the ladder. Correct -> banks that
    // rung's prize and (if more rounds remain) advances to the next; wrong -> eliminated, banking
    // whatever the last safe haven cleared was.
    public async Task<QuizGameSessionDto> SubmitMillionaireAnswerAsync(Guid memberId, Guid sessionId, int selectedIndex)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.GameMode != QuizGameMode.Millionaire)
            throw new InvalidOperationException("This session isn't a Millionaire game.");
        if (session.Status != QuizGameSessionStatus.InProgress)
            throw new InvalidOperationException("This session isn't in progress.");

        var participant = await db.QuizGameParticipants.FirstOrDefaultAsync(p => p.SessionId == sessionId && p.MemberId == memberId)
            ?? throw new InvalidOperationException("Join the session before answering.");
        if (participant.MillionaireStatus != QuizMillionaireStatus.Playing)
            throw new InvalidOperationException("Your run isn't active.");
        if (participant.MillionaireRoundEndsAt.HasValue && DateTimeOffset.UtcNow > participant.MillionaireRoundEndsAt.Value)
            throw new InvalidOperationException("Time's up for this question.");

        var roundIndex = participant.MillionaireRoundIndex;
        var alreadyAnswered = await db.QuizGameAnswers.AnyAsync(a =>
            a.SessionId == sessionId && a.QuestionIndex == roundIndex && a.MemberId == memberId);
        if (alreadyAnswered)
            throw new InvalidOperationException("You've already answered this question.");

        var round = await db.QuizMillionaireRounds.FirstOrDefaultAsync(r => r.SessionId == sessionId && r.RoundIndex == roundIndex)
            ?? throw new InvalidOperationException("Question not found for this round.");

        var isCorrect = selectedIndex == round.CorrectIndex;
        db.QuizGameAnswers.Add(new QuizGameAnswer
        {
            SessionId = sessionId,
            QuestionIndex = roundIndex,
            MemberId = memberId,
            SelectedIndex = selectedIndex,
            IsCorrect = isCorrect
        });

        if (isCorrect)
        {
            participant.MillionaireWinnings = MillionaireLadder.PrizeValues[roundIndex];
            if (roundIndex + 1 >= MillionaireLadder.RoundCount)
            {
                participant.MillionaireStatus = QuizMillionaireStatus.Won;
                participant.MillionaireRoundIndex = MillionaireLadder.RoundCount;
                participant.MillionaireRoundEndsAt = null;
            }
            else
            {
                var nextIndex = roundIndex + 1;
                await GetOrCreateMillionaireRoundAsync(sessionId, nextIndex);
                participant.MillionaireRoundIndex = nextIndex;
                participant.MillionaireRoundEndsAt = await IsSoloMillionaireSessionAsync(sessionId)
                    ? null
                    : DateTimeOffset.UtcNow.AddSeconds(MillionaireQuestionDurationSeconds);
            }
        }
        else
        {
            participant.MillionaireStatus = QuizMillionaireStatus.Eliminated;
            participant.MillionaireWinnings = MillionaireLadder.SafeHavenAmount(roundIndex);
            participant.MillionaireRoundEndsAt = null;
        }

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_millionaire_progress", new { sessionId, memberId });
        await TryCompleteMillionaireSessionIfDoneAsync(session);

        return await GetSessionAsync(sessionId, memberId);
    }

    // Banks whatever was won on the last correctly-answered rung and ends this participant's run,
    // without risking it on the current (unanswered) question.
    public async Task<QuizGameSessionDto> WalkAwayAsync(Guid memberId, Guid sessionId)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.GameMode != QuizGameMode.Millionaire)
            throw new InvalidOperationException("This session isn't a Millionaire game.");

        var participant = await db.QuizGameParticipants.FirstOrDefaultAsync(p => p.SessionId == sessionId && p.MemberId == memberId)
            ?? throw new InvalidOperationException("You're not in this session.");
        if (participant.MillionaireStatus != QuizMillionaireStatus.Playing)
            throw new InvalidOperationException("Your run isn't active.");

        participant.MillionaireWinnings = participant.MillionaireRoundIndex > 0
            ? MillionaireLadder.PrizeValues[participant.MillionaireRoundIndex - 1]
            : 0;
        participant.MillionaireStatus = QuizMillionaireStatus.WalkedAway;
        participant.MillionaireRoundEndsAt = null;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_millionaire_progress", new { sessionId, memberId });
        await TryCompleteMillionaireSessionIfDoneAsync(session);

        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<(bool IsCorrect, int CorrectIndex)> SubmitAnswerAsync(Guid memberId, Guid sessionId, int selectedIndex)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.GameMode != QuizGameMode.Classic)
            throw new InvalidOperationException("Use the Millionaire endpoints for this session.");
        if (session.Status != QuizGameSessionStatus.InProgress || session.CurrentQuestionRevealed)
            throw new InvalidOperationException("This question is no longer open for answers.");
        if (session.CurrentQuestionEndsAt.HasValue && DateTimeOffset.UtcNow > session.CurrentQuestionEndsAt.Value)
            throw new InvalidOperationException("Time's up for this question.");

        var isParticipant = await db.QuizGameParticipants.AnyAsync(p => p.SessionId == sessionId && p.MemberId == memberId);
        if (!isParticipant)
            throw new InvalidOperationException("Join the session before answering.");

        var alreadyAnswered = await db.QuizGameAnswers.AnyAsync(a =>
            a.SessionId == sessionId && a.QuestionIndex == session.CurrentQuestionIndex && a.MemberId == memberId);
        if (alreadyAnswered)
            throw new InvalidOperationException("You've already answered this question.");

        var isCorrect = selectedIndex == session.CurrentCorrectIndex;
        db.QuizGameAnswers.Add(new QuizGameAnswer
        {
            SessionId = sessionId,
            QuestionIndex = session.CurrentQuestionIndex,
            MemberId = memberId,
            SelectedIndex = selectedIndex,
            IsCorrect = isCorrect
        });
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_answer_submitted", new { sessionId, memberId });

        await TryProgressAsync(session);
        // Safe to hand back to this specific caller immediately, even though the room-wide
        // reveal (CurrentQuestionRevealed) hasn't fired yet -- nobody else can see this
        // response, so it doesn't leak the answer to anyone who hasn't submitted yet.
        return (isCorrect, session.CurrentCorrectIndex ?? -1);
    }

    // Called by QuizGameProgressWorker so reveal/advance/completion happen even if no client is
    // actively polling this session right now (e.g. everyone closed the tab mid-question).
    public async Task ProgressSessionAsync(Guid sessionId)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId);
        if (session is null) return;
        await TryProgressAsync(session);
    }

    public async Task<QuizGameSessionDto> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.QuizGameSessions.FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new KeyNotFoundException("Session not found.");

        await TryProgressAsync(session);

        var participants = await db.QuizGameParticipants
            .Include(p => p.Member)
            .Where(p => p.SessionId == sessionId)
            .OrderByDescending(p => session.GameMode == QuizGameMode.Millionaire ? p.MillionaireWinnings : p.Score)
            .ToListAsync();

        QuizGameAnswer? myAnswer = null;
        List<Guid> answeredIds = [];
        if (session.GameMode == QuizGameMode.Classic && session.CurrentQuestionIndex >= 0)
        {
            myAnswer = await db.QuizGameAnswers.FirstOrDefaultAsync(a =>
                a.SessionId == sessionId && a.QuestionIndex == session.CurrentQuestionIndex && a.MemberId == memberId);
            answeredIds = await db.QuizGameAnswers
                .Where(a => a.SessionId == sessionId && a.QuestionIndex == session.CurrentQuestionIndex)
                .Select(a => a.MemberId)
                .ToListAsync();
        }

        QuizMillionaireRunDto? myRun = null;
        if (session.GameMode == QuizGameMode.Millionaire)
        {
            var me = participants.FirstOrDefault(p => p.MemberId == memberId);
            if (me is not null)
            {
                string? question = null;
                var options = new List<string>();
                int? revealedCorrectIndex = null;
                var isAiGenerated = false;
                if (me.MillionaireRoundIndex >= 0 && me.MillionaireRoundIndex < MillionaireLadder.RoundCount)
                {
                    var round = await db.QuizMillionaireRounds
                        .FirstOrDefaultAsync(r => r.SessionId == sessionId && r.RoundIndex == me.MillionaireRoundIndex);
                    if (round is not null)
                    {
                        question = round.Question;
                        options = JsonSerializer.Deserialize<List<string>>(round.OptionsJson) ?? [];
                        isAiGenerated = round.IsAiGenerated;
                        if (me.MillionaireStatus == QuizMillionaireStatus.Eliminated)
                            revealedCorrectIndex = round.CorrectIndex;
                    }
                }

                myRun = new QuizMillionaireRunDto
                {
                    RoundIndex = me.MillionaireRoundIndex,
                    Status = me.MillionaireStatus.ToString(),
                    Question = question,
                    IsAiGenerated = isAiGenerated,
                    Options = options,
                    EndsAt = me.MillionaireRoundEndsAt,
                    Winnings = me.MillionaireWinnings,
                    SafeHavenWinnings = MillionaireLadder.SafeHavenAmount(Math.Max(me.MillionaireRoundIndex, 0)),
                    RevealedCorrectIndex = revealedCorrectIndex
                };
            }
        }

        return new QuizGameSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status.ToString(),
            GameMode = session.GameMode.ToString(),
            QuestionCount = session.QuestionCount,
            CurrentQuestionIndex = session.CurrentQuestionIndex,
            CurrentQuestion = session.CurrentQuestion,
            CurrentQuestionIsAiGenerated = session.CurrentQuestionIsAiGenerated,
            CurrentOptions = session.CurrentOptionsJson != null
                ? JsonSerializer.Deserialize<List<string>>(session.CurrentOptionsJson) ?? []
                : [],
            CurrentQuestionEndsAt = session.CurrentQuestionEndsAt,
            CurrentQuestionRevealed = session.CurrentQuestionRevealed,
            RevealEndsAt = session.CurrentQuestionRevealedAt?.AddSeconds(RevealDisplaySeconds),
            CurrentCorrectIndex = session.CurrentQuestionRevealed ? session.CurrentCorrectIndex : null,
            MyAnswerIndex = myAnswer?.SelectedIndex,
            AnsweredMemberIds = answeredIds,
            IsCreator = session.CreatedByMemberId == memberId,
            IsParticipant = participants.Any(p => p.MemberId == memberId),
            CurrentMemberId = memberId,
            Participants = participants.Select(p => new QuizGameParticipantDto
            {
                MemberId = p.MemberId,
                MemberName = p.Member != null ? $"{p.Member.FirstName} {p.Member.LastName}" : "Someone",
                Score = p.Score,
                MillionaireRoundIndex = p.MillionaireRoundIndex,
                MillionaireWinnings = p.MillionaireWinnings,
                MillionaireStatus = p.MillionaireStatus.ToString()
            }).ToList(),
            MillionairePrizeLadder = session.GameMode == QuizGameMode.Millionaire ? MillionaireLadder.PrizeValues.ToList() : [],
            MillionaireSafeHavenRounds = session.GameMode == QuizGameMode.Millionaire ? MillionaireLadder.SafeHavenRoundIndexes.ToList() : [],
            MyMillionaireRun = myRun
        };
    }

    // Lazily resolves the current question (once everyone's answered or time's up) and, after a short
    // reveal window, advances to the next question or completes the session. Called on every fetch and
    // every answer submission so progress happens without needing a separate background job.
    private async Task TryProgressAsync(QuizGameSession session)
    {
        if (session.Status != QuizGameSessionStatus.InProgress) return;
        if (session.GameMode == QuizGameMode.Millionaire)
        {
            await TryProgressMillionaireAsync(session);
            return;
        }

        if (!session.CurrentQuestionRevealed)
        {
            var participantIds = await db.QuizGameParticipants
                .Where(p => p.SessionId == session.Id)
                .Select(p => p.MemberId)
                .ToListAsync();
            var answeredIds = await db.QuizGameAnswers
                .Where(a => a.SessionId == session.Id && a.QuestionIndex == session.CurrentQuestionIndex)
                .Select(a => a.MemberId)
                .ToListAsync();
            var allAnswered = participantIds.Count > 0 && participantIds.All(answeredIds.Contains);
            var timedOut = session.CurrentQuestionEndsAt.HasValue && DateTimeOffset.UtcNow > session.CurrentQuestionEndsAt.Value;

            if (!allAnswered && !timedOut) return;

            // Concurrent polls/answers can all reach this point at once -- atomically flip the flag and
            // only the caller that actually wins the race (claimed > 0) scores and broadcasts the reveal.
            var claimedReveal = await db.QuizGameSessions
                .Where(s => s.Id == session.Id && !s.CurrentQuestionRevealed)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.CurrentQuestionRevealed, true)
                    .SetProperty(x => x.CurrentQuestionRevealedAt, DateTimeOffset.UtcNow));
            if (claimedReveal == 0) return;

            var correctMemberIds = await db.QuizGameAnswers
                .Where(a => a.SessionId == session.Id && a.QuestionIndex == session.CurrentQuestionIndex && a.IsCorrect)
                .Select(a => a.MemberId)
                .ToListAsync();
            if (correctMemberIds.Count > 0)
            {
                var scorers = await db.QuizGameParticipants
                    .Where(p => p.SessionId == session.Id && correctMemberIds.Contains(p.MemberId))
                    .ToListAsync();
                foreach (var p in scorers) p.Score += PointsPerCorrectAnswer;
                await db.SaveChangesAsync();
            }

            _ = WebSocketMiddleware.BroadcastAsync("quiz_game_question_revealed", new { sessionId = session.Id });
            return;
        }

        if (session.CurrentQuestionRevealedAt is null ||
            DateTimeOffset.UtcNow <= session.CurrentQuestionRevealedAt.Value.AddSeconds(RevealDisplaySeconds))
            return;

        if (session.CurrentQuestionIndex + 1 < session.QuestionCount)
        {
            var nextIndex = session.CurrentQuestionIndex + 1;
            var (question, options, correctIndex, isAiGenerated) = await questionGenerator.GenerateAsync(
                "QuizGame", $"Quiz Game — question {nextIndex + 1}", session.DifficultyLevel);
            var optionsJson = JsonSerializer.Serialize(options);
            var nextEndsAt = DateTimeOffset.UtcNow.AddSeconds(QuestionDurationSeconds);

            // Guard on the index we read: if another caller already advanced past it, this update
            // affects zero rows and we don't overwrite their progress (or double-advance).
            var claimedAdvance = await db.QuizGameSessions
                .Where(s => s.Id == session.Id && s.CurrentQuestionIndex == session.CurrentQuestionIndex && s.CurrentQuestionRevealed)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.CurrentQuestionIndex, nextIndex)
                    .SetProperty(x => x.CurrentQuestion, question)
                    .SetProperty(x => x.CurrentOptionsJson, optionsJson)
                    .SetProperty(x => x.CurrentCorrectIndex, correctIndex)
                    .SetProperty(x => x.CurrentQuestionIsAiGenerated, isAiGenerated)
                    .SetProperty(x => x.CurrentQuestionEndsAt, nextEndsAt)
                    .SetProperty(x => x.CurrentQuestionRevealed, false)
                    .SetProperty(x => x.CurrentQuestionRevealedAt, (DateTimeOffset?)null));
            if (claimedAdvance == 0) return;
            _ = WebSocketMiddleware.BroadcastAsync("quiz_game_next_question", new { sessionId = session.Id });
        }
        else
        {
            var claimedCompletion = await db.QuizGameSessions
                .Where(s => s.Id == session.Id && s.Status == QuizGameSessionStatus.InProgress)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.Status, QuizGameSessionStatus.Completed)
                    .SetProperty(x => x.CompletedAt, DateTimeOffset.UtcNow));
            if (claimedCompletion == 0) return;
            await AwardLeaderboardPointsAsync(session);
            _ = WebSocketMiddleware.BroadcastAsync("quiz_game_completed", new { sessionId = session.Id });
        }
    }

    private async Task AwardLeaderboardPointsAsync(QuizGameSession session)
    {
        var participants = await db.QuizGameParticipants
            .Where(p => p.SessionId == session.Id)
            .ToListAsync();
        if (participants.Count == 0) return;

        var sessionLabel = !string.IsNullOrWhiteSpace(session.Title) ? session.Title : session.CreatedAt.ToString("MMM d, yyyy");

        foreach (var p in participants.Where(p => p.Score > 0))
        {
            db.PointAwards.Add(new PointAward
            {
                TeamMemberId = p.MemberId,
                Points = p.Score,
                Reason = $"Quiz Game — {sessionLabel}",
                AwardedAt = DateTimeOffset.UtcNow
            });
        }

        var topScore = participants.Max(p => p.Score);
        if (topScore > 0)
        {
            var achievement = await db.Achievements.FirstOrDefaultAsync(a => a.Key == "quiz-game-champion");
            if (achievement is not null)
            {
                foreach (var winner in participants.Where(p => p.Score == topScore))
                {
                    db.MemberAchievements.Add(new MemberAchievement
                    {
                        TeamMemberId = winner.MemberId,
                        AchievementId = achievement.Id,
                        AwardedAt = DateTimeOffset.UtcNow,
                        Note = sessionLabel
                    });
                }
            }
        }

        await db.SaveChangesAsync();
    }

    // Auto-eliminates anyone whose per-participant timer ran out without an answer, then checks
    // whether the session as a whole is done. Called both lazily (on fetch/answer) and by
    // QuizGameProgressWorker so a run doesn't get stuck just because the player closed their tab.
    private async Task TryProgressMillionaireAsync(QuizGameSession session)
    {
        var now = DateTimeOffset.UtcNow;
        var timedOut = await db.QuizGameParticipants
            .Where(p => p.SessionId == session.Id
                && p.MillionaireStatus == QuizMillionaireStatus.Playing
                && p.MillionaireRoundEndsAt != null && p.MillionaireRoundEndsAt < now)
            .ToListAsync();

        foreach (var p in timedOut)
        {
            // Guard against racing SubmitMillionaireAnswerAsync for the same participant.
            var claimed = await db.QuizGameParticipants
                .Where(x => x.Id == p.Id && x.MillionaireStatus == QuizMillionaireStatus.Playing)
                .ExecuteUpdateAsync(x => x
                    .SetProperty(y => y.MillionaireStatus, QuizMillionaireStatus.Eliminated)
                    .SetProperty(y => y.MillionaireWinnings, MillionaireLadder.SafeHavenAmount(p.MillionaireRoundIndex))
                    .SetProperty(y => y.MillionaireRoundEndsAt, (DateTimeOffset?)null));
            if (claimed > 0)
            {
                // ExecuteUpdateAsync bypasses the change tracker -- keep this tracked instance in
                // sync so TryCompleteMillionaireSessionIfDoneAsync's re-query below (same request,
                // same identity map) doesn't see the pre-elimination "Playing" status.
                p.MillionaireStatus = QuizMillionaireStatus.Eliminated;
                p.MillionaireWinnings = MillionaireLadder.SafeHavenAmount(p.MillionaireRoundIndex);
                p.MillionaireRoundEndsAt = null;
                _ = WebSocketMiddleware.BroadcastAsync("quiz_game_millionaire_progress", new { sessionId = session.Id, memberId = p.MemberId });
            }
        }

        await TryCompleteMillionaireSessionIfDoneAsync(session);
    }

    // The session completes once every participant has reached a terminal state. Someone who
    // joined but never started their run (still NotStarted) keeps the session open indefinitely --
    // that's intentional, since unlike Classic there's no "everyone answers together" deadline
    // forcing the issue, and they may come back to play later.
    private async Task TryCompleteMillionaireSessionIfDoneAsync(QuizGameSession session)
    {
        var participants = await db.QuizGameParticipants.Where(p => p.SessionId == session.Id).ToListAsync();
        if (participants.Count == 0) return;
        var allDone = participants.All(p => p.MillionaireStatus is
            QuizMillionaireStatus.Eliminated or QuizMillionaireStatus.WalkedAway or QuizMillionaireStatus.Won);
        if (!allDone) return;

        var completedAt = DateTimeOffset.UtcNow;
        var claimedCompletion = await db.QuizGameSessions
            .Where(s => s.Id == session.Id && s.Status == QuizGameSessionStatus.InProgress)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Status, QuizGameSessionStatus.Completed)
                .SetProperty(x => x.CompletedAt, completedAt));
        if (claimedCompletion == 0) return;

        // ExecuteUpdateAsync bypasses the change tracker -- without this, the in-memory `session`
        // (and anything built from it later in this same request, e.g. SubmitMillionaireAnswerAsync's
        // own response) would still report the stale "InProgress" status it had before this call.
        session.Status = QuizGameSessionStatus.Completed;
        session.CompletedAt = completedAt;

        await AwardMillionaireLeaderboardPointsAsync(session, participants);
        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_completed", new { sessionId = session.Id });
    }

    private async Task AwardMillionaireLeaderboardPointsAsync(QuizGameSession session, List<QuizGameParticipant> participants)
    {
        var sessionLabel = !string.IsNullOrWhiteSpace(session.Title) ? session.Title : session.CreatedAt.ToString("MMM d, yyyy");

        foreach (var p in participants.Where(p => p.MillionaireWinnings > 0))
        {
            db.PointAwards.Add(new PointAward
            {
                TeamMemberId = p.MemberId,
                Points = (int)Math.Max(1, p.MillionaireWinnings / 1000),
                Reason = $"Quiz Millionaire — {sessionLabel} (${p.MillionaireWinnings:N0})",
                AwardedAt = DateTimeOffset.UtcNow
            });
        }

        var winners = participants.Where(p => p.MillionaireStatus == QuizMillionaireStatus.Won).ToList();
        if (winners.Count > 0)
        {
            var achievement = await db.Achievements.FirstOrDefaultAsync(a => a.Key == "quiz-millionaire");
            if (achievement is not null)
            {
                foreach (var winner in winners)
                {
                    db.MemberAchievements.Add(new MemberAchievement
                    {
                        TeamMemberId = winner.MemberId,
                        AchievementId = achievement.Id,
                        AwardedAt = DateTimeOffset.UtcNow,
                        Note = sessionLabel
                    });
                }
            }
        }

        await db.SaveChangesAsync();
    }

    // Generates (and caches) the question for a given round, shared by every participant who
    // reaches it -- guards against two participants racing to create the same round at once via
    // the unique (SessionId, RoundIndex) index.
    // Solo Millionaire sessions skip the per-question timer entirely -- there's no one else's pace
    // to keep up with, so the pressure (and the risk of being timed out by tab-switching) is just
    // friction. Re-checked every round rather than fixed at session start, in case someone else
    // joins partway through.
    private async Task<bool> IsSoloMillionaireSessionAsync(Guid sessionId) =>
        await db.QuizGameParticipants.CountAsync(p => p.SessionId == sessionId) <= 1;

    private async Task<QuizMillionaireRound> GetOrCreateMillionaireRoundAsync(Guid sessionId, int roundIndex)
    {
        var existing = await db.QuizMillionaireRounds.FirstOrDefaultAsync(r => r.SessionId == sessionId && r.RoundIndex == roundIndex);
        if (existing is not null) return existing;

        var (question, options, correctIndex, isAiGenerated) = await questionGenerator.GenerateAsync(
            "QuizGameMillionaire", $"Quiz Millionaire — question {roundIndex + 1}", MillionaireLadder.DifficultyLevel(roundIndex));

        var round = new QuizMillionaireRound
        {
            SessionId = sessionId,
            RoundIndex = roundIndex,
            Question = question,
            OptionsJson = JsonSerializer.Serialize(options),
            CorrectIndex = correctIndex,
            IsAiGenerated = isAiGenerated
        };
        db.QuizMillionaireRounds.Add(round);
        try
        {
            await db.SaveChangesAsync();
            return round;
        }
        catch (DbUpdateException)
        {
            db.Entry(round).State = EntityState.Detached;
            return await db.QuizMillionaireRounds.FirstAsync(r => r.SessionId == sessionId && r.RoundIndex == roundIndex);
        }
    }
}
