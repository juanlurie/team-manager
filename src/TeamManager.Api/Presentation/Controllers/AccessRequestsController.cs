using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccessRequestsController(AppDbContext db) : ControllerBase
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

        return Ok(new { id = request.Id, status = request.Status });
    }

    [HttpGet]
    [Authorize(Roles = "TeamLead,TechLead")]
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
    [Authorize(Roles = "TeamLead,TechLead")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveDto? dto)
    {
        var request = await db.AccessRequests.FindAsync(id);
        if (request == null) return NotFound();
        if (request.Status != "Pending") return BadRequest(new { error = "Request is not pending." });

        var reviewerId = User.FindFirst("TMID")?.Value;
        if (string.IsNullOrEmpty(reviewerId)) return Forbid();

        var existing = await db.TeamMembers
            .FirstOrDefaultAsync(m => m.Email.ToLower() == request.Email.ToLower());

        if (existing != null)
        {
            if (!existing.IsActive)
            {
                existing.IsActive = true;
                if (!string.IsNullOrEmpty(request.GoogleSub))
                    existing.ExternalSubjectId = request.GoogleSub;
                await db.SaveChangesAsync();
            }
            request.Status = "Approved";
            request.ReviewedByMemberId = Guid.Parse(reviewerId);
            request.ReviewedAt = DateTimeOffset.UtcNow;
            request.ReviewNotes = dto?.Notes;
            await db.SaveChangesAsync();
            return Ok(new { status = "Approved", note = "Member reactivated." });
        }

        var member = new TeamMember
        {
            Id = Guid.NewGuid(),
            FirstName = request.Name.Split(' ', 2)[0],
            LastName = request.Name.Split(' ', 2).Length > 1 ? request.Name.Split(' ', 2)[1] : "",
            Email = request.Email,
            Role = Domain.Enums.MemberRole.Member,
            IsActive = true,
            Crafts = new List<string>()
        };

        if (!string.IsNullOrEmpty(request.GoogleSub))
            member.ExternalSubjectId = request.GoogleSub;

        db.TeamMembers.Add(member);

        request.Status = "Approved";
        request.ReviewedByMemberId = Guid.Parse(reviewerId);
        request.ReviewedAt = DateTimeOffset.UtcNow;
        request.ReviewNotes = dto?.Notes;

        await db.SaveChangesAsync();

        return Ok(new { status = "Approved", memberId = member.Id });
    }

    [HttpPost("{id}/deny")]
    [Authorize(Roles = "TeamLead,TechLead")]
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

    public record SubmitRequestDto(string Email, string Name, string? GoogleSub, string? Reason);
    public record ApproveDto(string? Notes);
}
