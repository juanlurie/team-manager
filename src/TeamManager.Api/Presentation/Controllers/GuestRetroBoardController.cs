using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Application.Services;

namespace TeamManager.Api.Presentation.Controllers;

/// <summary>Anonymous guest access to a retro board, reached by its shareable slug (the QR / join
/// link). The guest's identity is a server-issued, signed httpOnly cookie (see GuestSessionManager,
/// scoped to this path) — never trusted from the request body. See docs/session-identity.md.</summary>
[ApiController]
[AllowAnonymous]
[Route("api/v1/guest/retro-board")]
public class GuestRetroBoardController(RetroBoardService service, GuestSessionManager sessions) : ControllerBase
{
    // GET is the natural first touch, so it mints the guest cookie (like the WoW guest controller).
    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug)
    {
        var guestSessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Retro);
        var board = await service.GetGuestBoardAsync(slug, guestSessionId);
        return board is null ? NotFound() : Ok(board);
    }

    [HttpPost("{slug}/join")]
    public async Task<IActionResult> Join(string slug, [FromBody] GuestJoinRetroRequest req)
    {
        var guestSessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Retro);
        var (result, board) = await service.JoinGuestAsync(slug, guestSessionId, req.DisplayName);
        return result switch
        {
            RetroActionResult.Ok => Ok(board),
            RetroActionResult.Invalid => BadRequest(new { error = "A display name is required." }),
            RetroActionResult.Closed => Conflict(new { error = "This retro is closed." }),
            _ => NotFound(),
        };
    }

    [HttpPost("{slug}/notes")]
    public async Task<IActionResult> AddNote(string slug, [FromBody] AddRetroBoardNoteRequest req)
    {
        var guestSessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Retro);
        return BoardResult(await service.AddGuestNoteAsync(slug, guestSessionId, req));
    }

    [HttpDelete("{slug}/notes/{noteId:guid}")]
    public async Task<IActionResult> DeleteNote(string slug, Guid noteId)
    {
        var guestSessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Retro);
        return BoardResult(await service.DeleteGuestNoteAsync(slug, guestSessionId, noteId));
    }

    [HttpPost("{slug}/notes/{noteId:guid}/vote")]
    public async Task<IActionResult> Vote(string slug, Guid noteId)
    {
        var guestSessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Retro);
        var (result, error) = await service.AddGuestVoteAsync(slug, guestSessionId, noteId);
        return result switch
        {
            RetroActionResult.Ok => NoContent(),
            RetroActionResult.Conflict => Conflict(new { error }),
            RetroActionResult.Closed => Conflict(new { error }),
            RetroActionResult.Forbidden => StatusCode(StatusCodes.Status403Forbidden),
            _ => NotFound(new { error }),
        };
    }

    [HttpDelete("{slug}/notes/{noteId:guid}/vote")]
    public async Task<IActionResult> RemoveVote(string slug, Guid noteId)
    {
        var guestSessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Retro);
        var result = await service.RemoveGuestVoteAsync(slug, guestSessionId, noteId);
        return result switch
        {
            RetroActionResult.Ok => NoContent(),
            RetroActionResult.Closed => Conflict(new { error = "This retro is closed." }),
            RetroActionResult.Forbidden => StatusCode(StatusCodes.Status403Forbidden),
            _ => NotFound(),
        };
    }

    [HttpPost("{slug}/feedback-prompts/{promptId:guid}/respond")]
    public async Task<IActionResult> RespondFeedback(string slug, Guid promptId, [FromBody] FeedbackResponseRequest req)
    {
        var guestSessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Retro);
        var result = await service.RespondGuestFeedbackAsync(slug, guestSessionId, promptId, req.Score, req.Comment);
        return result switch
        {
            RetroActionResult.Ok => NoContent(),
            RetroActionResult.Invalid => BadRequest(new { error = "Pick a rating from 1 to 5." }),
            RetroActionResult.Forbidden => StatusCode(StatusCodes.Status403Forbidden, new { error = "Join the retro before reflecting." }),
            _ => NotFound(),
        };
    }

    // Guest note mutations return the refreshed guest board on success; a Forbidden here means the
    // caller hasn't joined (named themselves) yet, Closed means the retro is closed.
    private IActionResult BoardResult((RetroActionResult result, GuestRetroBoardDto? board) outcome) =>
        outcome.result switch
        {
            RetroActionResult.Ok => Ok(outcome.board),
            RetroActionResult.Invalid => BadRequest(new { error = "A note needs some text." }),
            RetroActionResult.Forbidden => StatusCode(StatusCodes.Status403Forbidden, new { error = "Join the retro before contributing." }),
            RetroActionResult.Closed => Conflict(new { error = "This retro is closed." }),
            _ => NotFound(),
        };
}
