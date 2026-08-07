using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;

namespace TeamManager.Api.Application.Services;

// AI synthesis of converging themes across voted notes, surfaced going into Discuss. Mirrors
// AnalyseAsync's guard/error-handling shape (facilitator-only, blockClosed: false, never throws) —
// not GroupSimilarNotesAsync's window-gated guard, since the manual "Re-analyse" trigger must stay
// callable regardless of phase.
public partial class RetroBoardService
{
    public async Task<(bool ok, string? error, RetroVoteThemeSummaryDto? summary)> AnalyseVotingThemesAsync(
        Guid sessionId, Guid memberId, Guid? columnId = null)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard == RetroActionResult.NotFound) return (false, "Session not found.", null);
        if (guard != RetroActionResult.Ok) return (false, "Only a facilitator can generate themes.", null);

        var notes = await db.RetroBoardNotes.AsNoTracking()
            .Include(n => n.Column)
            .Include(n => n.Votes)
            .Where(n => n.RetroBoardSessionId == sessionId && n.Votes.Count > 0)
            .Where(n => columnId == null || n.RetroBoardColumnId == columnId)
            .ToListAsync();
        if (notes.Count == 0) return await FailAsync(sessionId, "No voted notes to synthesise.");

        var noteList = string.Join("\n", notes.Select(n => $"{n.Id}|{n.Column?.Label ?? "Notes"}|{n.Votes.Count}|{n.Text}"));

        var raw = await aiExecutor.ExecuteAsync(
            "RetroVoteThemeSynthesis",
            new Dictionary<string, string> { ["votedNotes"] = noteList },
            "RetroBoardSession", $"Vote theme synthesis for session {sessionId}", sessionId.ToString());

        if (raw is null)
            return await FailAsync(sessionId, "Theme synthesis unavailable — configure a RetroVoteThemeSynthesis prompt to enable this.");

        RetroVoteThemeSummaryDto? summary;
        try { summary = JsonSerializer.Deserialize<RetroVoteThemeSummaryDto>(raw, JsonRead); }
        catch { return await FailAsync(sessionId, "AI returned an unexpected format."); }
        if (summary is null || summary.Themes.Count == 0) return await FailAsync(sessionId, "AI found no converging themes.");

        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        session!.VoteThemesJson = JsonSerializer.Serialize(summary, Json);
        session.VoteThemesError = null;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_vote_themes_ready", new { sessionId });
        return (true, null, summary);
    }

    /// <summary>Records a synthesis failure on the session (so a facilitator who refreshes after a
    /// failed auto-fire can see why no themes appeared) without disturbing the last good
    /// <see cref="RetroBoardSession.VoteThemesJson"/>, then hands the error back to the caller.</summary>
    private async Task<(bool ok, string? error, RetroVoteThemeSummaryDto? summary)> FailAsync(Guid sessionId, string error)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is not null)
        {
            session.VoteThemesError = error;
            await db.SaveChangesAsync();
        }
        return (false, error, null);
    }

    /// <summary>Fire-and-forget entry point for the Discuss-phase auto-fire (<see cref="SetPhaseAsync"/>).
    /// Runs on its own DI scope/DbContext, exactly like <c>WinStoryGenerator</c>, since the request's
    /// scoped <c>db</c> is disposed once the controller returns and this outlives that. Never throws
    /// back into the phase-transition flow — <see cref="AnalyseVotingThemesAsync"/> already converts
    /// every failure into a persisted <see cref="RetroBoardSession.VoteThemesError"/>, so the catch here
    /// only guards against something outside that (e.g. the scope itself failing to resolve).</summary>
    private void AutoFireVoteThemesAsync(Guid sessionId, Guid memberId)
    {
        _ = Task.Run(async () =>
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var bgService = scope.ServiceProvider.GetRequiredService<RetroBoardService>();
            try { await bgService.AnalyseVotingThemesAsync(sessionId, memberId); }
            catch { /* best-effort */ }
        });
    }
}
