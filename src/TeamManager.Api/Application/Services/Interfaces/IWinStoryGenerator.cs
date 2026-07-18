namespace TeamManager.Api.Application.Services.Interfaces;

/// <summary>
/// Kicks off best-effort, fire-and-forget generation of a winning nomination's "win story" (an AI
/// blurb), persisting it and announcing it when ready. Extracted from WinOfTheWeekService so closing
/// a week doesn't spin up a background DI scope inline — which is what made the close path awkward to
/// unit-test. Tests inject a no-op.
/// </summary>
public interface IWinStoryGenerator
{
    /// <summary>Enqueue generation for a week's winner. Returns immediately; work runs in the background.</summary>
    void Enqueue(Guid weekId, string winnerName, string title, string? description);
}
