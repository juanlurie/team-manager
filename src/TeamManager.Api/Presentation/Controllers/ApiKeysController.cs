using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.ApiKey;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/api-keys")]
[Authorize]
public class ApiKeysController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var tmid = User.FindFirst("TMID")?.Value
                ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var isTeamLead = User.IsInRole("TeamLead");

        var query = db.ApiKeys
            .IgnoreQueryFilters()
            .Include(k => k.TeamMember)
            .Where(k => k.TeamMember.IsActive);

        if (!isTeamLead && !string.IsNullOrWhiteSpace(tmid) && Guid.TryParse(tmid, out var userId))
            query = query.Where(k => k.TeamMemberId == userId);

        var keys = await query
            .Select(k => new ApiKeyResponse(
                k.Id,
                k.Name,
                k.TeamMemberId,
                $"{k.TeamMember.FirstName} {k.TeamMember.LastName}",
                k.TeamMember.Role.ToString(),
                k.IsActive,
                k.CreatedAt,
                k.ExpiresAt,
                k.LastUsedAt
            ))
            .ToListAsync();

        return Ok(keys);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest request)
    {
        // Derive team member ID from authenticated user's claims
        var tmid = User.FindFirst("TMID")?.Value
                ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

        Guid memberGuid;
        if (!string.IsNullOrWhiteSpace(tmid) && Guid.TryParse(tmid, out memberGuid))
        {
            // TMID claim is a GUID (added by claims transformer)
        }
        else
        {
            // Fallback: find by external subject ID
            var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(sub))
                return Unauthorized("Unable to identify authenticated user.");

            var fallbackMember = await db.TeamMembers
                .FirstOrDefaultAsync(m => m.ExternalSubjectId == sub && m.IsActive);
            if (fallbackMember == null)
                return Unauthorized("User not found in team members.");

            memberGuid = fallbackMember.Id;
        }

        var member = await db.TeamMembers.FindAsync(memberGuid);
        if (member == null || !member.IsActive)
            return NotFound("Team member not found or inactive.");

        var rawKey = GenerateKey();
        var keyHash = HashKey(rawKey);

        var apiKey = new ApiKey
        {
            Name = request.Name,
            KeyHash = keyHash,
            TeamMemberId = member.Id,
            ExpiresAt = request.ExpiresAt,
        };

        db.ApiKeys.Add(apiKey);
        await db.SaveChangesAsync();

        var result = new CreatedApiKeyResult(
            apiKey.Id,
            apiKey.Name,
            rawKey,
            member.Id,
            $"{member.FirstName} {member.LastName}",
            member.Role.ToString(),
            apiKey.IsActive,
            apiKey.CreatedAt,
            apiKey.ExpiresAt
        );

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id)
    {
        var apiKey = await db.ApiKeys.IgnoreQueryFilters().FirstOrDefaultAsync(k => k.Id == id);
        if (apiKey == null)
            return NotFound();

        // TeamLead can revoke any key, others only their own
        var tmid = User.FindFirst("TMID")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!User.IsInRole("TeamLead") && apiKey.TeamMemberId.ToString() != tmid)
            return Forbid();

        apiKey.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static string GenerateKey()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return $"tm_{Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "")}";
    }

    private static string HashKey(string key)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
