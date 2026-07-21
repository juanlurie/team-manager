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
}
