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
            QuestionCount = s.QuestionCount,
            CreatedByName = s.CreatedByMember != null ? $"{s.CreatedByMember.FirstName} {s.CreatedByMember.LastName}" : "Someone",
            ParticipantCount = s.Participants.Count,
            CreatedAt = s.CreatedAt
        }).ToList();
    }

    public async Task<QuizGameSessionDto> CreateSessionAsync(Guid memberId, string? title, int questionCount)
    {
        var session = new QuizGameSession
        {
            CreatedByMemberId = memberId,
            Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim(),
            QuestionCount = Math.Clamp(questionCount, 3, 25)
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

        var (question, options, correctIndex) = await questionGenerator.GenerateAsync("QuizGame", "Quiz Game — question 1");
        session.CurrentQuestionIndex = 0;
        session.CurrentQuestion = question;
        session.CurrentOptionsJson = JsonSerializer.Serialize(options);
        session.CurrentCorrectIndex = correctIndex;
        session.CurrentQuestionEndsAt = DateTimeOffset.UtcNow.AddSeconds(QuestionDurationSeconds);
        session.Status = QuizGameSessionStatus.InProgress;
        session.StartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("quiz_game_started", new { sessionId });

        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<bool> SubmitAnswerAsync(Guid memberId, Guid sessionId, int selectedIndex)
    {
        var session = await db.QuizGameSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
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
        return isCorrect;
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
            .OrderByDescending(p => p.Score)
            .ToListAsync();

        QuizGameAnswer? myAnswer = null;
        List<Guid> answeredIds = [];
        if (session.CurrentQuestionIndex >= 0)
        {
            myAnswer = await db.QuizGameAnswers.FirstOrDefaultAsync(a =>
                a.SessionId == sessionId && a.QuestionIndex == session.CurrentQuestionIndex && a.MemberId == memberId);
            answeredIds = await db.QuizGameAnswers
                .Where(a => a.SessionId == sessionId && a.QuestionIndex == session.CurrentQuestionIndex)
                .Select(a => a.MemberId)
                .ToListAsync();
        }

        return new QuizGameSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status.ToString(),
            QuestionCount = session.QuestionCount,
            CurrentQuestionIndex = session.CurrentQuestionIndex,
            CurrentQuestion = session.CurrentQuestion,
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
                Score = p.Score
            }).ToList()
        };
    }

    // Lazily resolves the current question (once everyone's answered or time's up) and, after a short
    // reveal window, advances to the next question or completes the session. Called on every fetch and
    // every answer submission so progress happens without needing a separate background job.
    private async Task TryProgressAsync(QuizGameSession session)
    {
        if (session.Status != QuizGameSessionStatus.InProgress) return;

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
            var (question, options, correctIndex) = await questionGenerator.GenerateAsync(
                "QuizGame", $"Quiz Game — question {nextIndex + 1}");
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
}
