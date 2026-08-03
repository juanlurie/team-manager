using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

/// <summary>
/// Reviewing access requests is a management action: it grants someone entry to the app and can
/// place them in a squad. List, approve and deny are [Authorize(Roles = "TeamLead")]; they carried a
/// bare [Authorize], which is identical to the global FallbackPolicy in Program.cs -- it reads as a
/// gate but restricts nothing, and list returns every requester's name, email, googleSub and
/// free-text reason. TechLead is excluded (no management significance); Admin passes via the implied
/// TeamLead claim. The class-level [RequireFeature] is not the boundary -- a settings toggle is not
/// an authorization decision -- so both gates apply. Submit stays anonymous: it is the public entry
/// point, and is the reason unauthenticated input must never reach the squad assignment below.
/// </summary>
[ApiController]
[RequireFeature("access-requests")]
[Route("api/[controller]")]
public class AccessRequestsController(AppDbContext db, AccessRequestApprovalService approvals) : ControllerBase
{
    [HttpPost("submit")]
    [AllowAnonymous]
    public async Task<IActionResult> Submit([FromBody] SubmitRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Email and name are required." });

        var existing = await db.AccessRequests
            .FirstOrDefaultAsync(r => r.Email.ToLower() == dto.Email.ToLower() && r.Status == "Pending");

        if (existing != null)
            return BadRequest(new { error = "You already have a pending request." });

        var alreadyMember = await db.TeamMembers
            .AnyAsync(m => m.Email.ToLower() == dto.Email.ToLower() && m.IsActive);

        if (alreadyMember)
            return BadRequest(new { error = "This email is already registered." });

        var request = new AccessRequest
        {
            Id = Guid.NewGuid(),
            Email = dto.Email.Trim(),
            Name = dto.Name.Trim(),
            GoogleSub = dto.GoogleSub,
            Reason = dto.Reason?.Trim() ?? string.Empty,
            Status = "Pending"
        };

        db.AccessRequests.Add(request);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("access_request_submitted", new { id = request.Id, name = request.Name, email = request.Email });

        return Ok(new { id = request.Id, status = request.Status });
    }

    [HttpGet]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var query = db.AccessRequests.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var requests = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.Email,
                r.Name,
                r.GoogleSub,
                r.Reason,
                r.Status,
                r.CreatedAt,
                ReviewedByName = r.ReviewedByMember != null
                    ? r.ReviewedByMember.FirstName + " " + r.ReviewedByMember.LastName
                    : null,
                r.ReviewedAt,
                r.ReviewNotes
            })
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveDto? dto)
    {
        var reviewerId = User.FindFirst("TMID")?.Value;
        if (string.IsNullOrEmpty(reviewerId)) return Forbid();

        var result = await approvals.ApproveAsync(
            id,
            Guid.Parse(reviewerId),
            new ApprovalInput(dto?.Notes, dto?.TeamMemberId, dto?.SquadId));

        switch (result.Outcome)
        {
            case ApprovalOutcome.RequestNotFound:
                return NotFound();
            case ApprovalOutcome.NotPending:
                return BadRequest(new { error = "Request is not pending." });
            case ApprovalOutcome.MemberNotFound:
                return BadRequest(new { error = "Selected team member not found." });
            case ApprovalOutcome.SquadNotFound:
                return BadRequest(new { error = "Selected squad not found." });
            case ApprovalOutcome.EmailTaken:
                return BadRequest(new { error = $"Another team member already uses {result.ConflictingEmail}." });
        }

        // guestAllowed: true -- the requester's own browser is still an unapproved/anonymous
        // connection (no TeamMember yet, so no TMID claim) at this point, and BroadcastAsync skips
        // such connections by default. Without this, the requester never receives the event their
        // own "waiting for approval" screen is listening for to auto-complete login.
        _ = WebSocketMiddleware.BroadcastAsync("access_request_approved", new { requestId = id }, guestAllowed: true);

        return result.Reactivated
            ? Ok(new { status = "Approved", memberId = result.MemberId, note = "Member reactivated." })
            : Ok(new { status = "Approved", memberId = result.MemberId });
    }

    [HttpPost("{id}/deny")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Deny(Guid id, [FromBody] ApproveDto? dto)
    {
        var request = await db.AccessRequests.FindAsync(id);
        if (request == null) return NotFound();
        if (request.Status != "Pending") return BadRequest(new { error = "Request is not pending." });

        var reviewerId = User.FindFirst("TMID")?.Value;
        if (string.IsNullOrEmpty(reviewerId)) return Forbid();

        request.Status = "Denied";
        request.ReviewedByMemberId = Guid.Parse(reviewerId);
        request.ReviewedAt = DateTimeOffset.UtcNow;
        request.ReviewNotes = dto?.Notes;

        await db.SaveChangesAsync();
        return Ok(new { status = "Denied" });
    }

    /// <summary>
    /// Carries no squad: Submit is anonymous, and unauthenticated input must not write org
    /// structure. Where the requester is placed is the reviewer's decision, made at approve time.
    /// </summary>
    public record SubmitRequestDto(string Email, string Name, string? GoogleSub, string? Reason);

    public record ApproveDto(string? Notes, Guid? TeamMemberId = null, Guid? SquadId = null);
}
