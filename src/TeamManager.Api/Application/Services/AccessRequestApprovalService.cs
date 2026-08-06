using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public enum ApprovalOutcome
{
    Success,
    RequestNotFound,
    NotPending,
    /// <summary>The reviewer picked an existing member to link to and it no longer exists.</summary>
    MemberNotFound,
    /// <summary>The reviewer picked a squad that does not exist.</summary>
    SquadNotFound,
    /// <summary>Moving the request's email onto the linked member would collide with someone else.</summary>
    EmailTaken
}

public record ApprovalInput(string? Notes = null, Guid? TeamMemberId = null, Guid? SquadId = null);

public record ApprovalResult(
    ApprovalOutcome Outcome,
    Guid? MemberId = null,
    bool Reactivated = false,
    string? ConflictingEmail = null)
{
    public static readonly ApprovalResult RequestNotFound = new(ApprovalOutcome.RequestNotFound);
    public static readonly ApprovalResult NotPending = new(ApprovalOutcome.NotPending);
    public static readonly ApprovalResult MemberNotFound = new(ApprovalOutcome.MemberNotFound);
    public static readonly ApprovalResult SquadNotFound = new(ApprovalOutcome.SquadNotFound);
    public static ApprovalResult EmailTaken(string email) => new(ApprovalOutcome.EmailTaken, ConflictingEmail: email);
}

/// <summary>
/// Approving an access request either reactivates an existing member or creates a new one, and may
/// place that member into a squad. Extracted from the controller because the two branches each ended
/// in their own SaveChanges: bolting squad assignment onto that shape meant writing it twice.
/// Here the branches differ only in how the member is obtained, and everything after -- the request's
/// review fields, the squad assignment, the single save -- is written once.
/// </summary>
public class AccessRequestApprovalService(AppDbContext db, SquadService squads)
{
    public async Task<ApprovalResult> ApproveAsync(Guid requestId, Guid reviewerId, ApprovalInput input)
    {
        var request = await db.AccessRequests.FindAsync(requestId);
        if (request is null) return ApprovalResult.RequestNotFound;
        if (request.Status != "Pending") return ApprovalResult.NotPending;

        // Validated before anything is mutated, so a bad squad id fails the whole approval rather
        // than granting access and then falling over. A null SquadId is normal, not an error -- the
        // reviewer simply didn't assign one.
        Squad? squad = null;
        if (input.SquadId is { } squadId)
        {
            squad = await db.Squads.FindAsync(squadId);
            if (squad is null) return ApprovalResult.SquadNotFound;
        }

        var existing = input.TeamMemberId is { } linkedMemberId
            ? await db.TeamMembers.FindAsync(linkedMemberId)
            : await db.TeamMembers.FirstOrDefaultAsync(m => m.Email.ToLower() == request.Email.ToLower());

        if (input.TeamMemberId is not null && existing is null)
            return ApprovalResult.MemberNotFound;

        var reactivated = existing is not null;
        TeamMember member;

        if (existing is not null)
        {
            if (input.TeamMemberId is not null &&
                !string.Equals(existing.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailTaken = await db.TeamMembers
                    .AnyAsync(m => m.Id != existing.Id && m.Email.ToLower() == request.Email.ToLower());
                if (emailTaken) return ApprovalResult.EmailTaken(request.Email);
                existing.Email = request.Email.Trim();
            }

            existing.IsActive = true;
            member = existing;
        }
        else
        {
            var parts = request.Name.Split(' ', 2);
            member = new TeamMember
            {
                Id = Guid.NewGuid(),
                FirstName = parts[0],
                LastName = parts.Length > 1 ? parts[1] : "",
                Email = request.Email.Trim(),
                Role = MemberRole.Member,
                IsActive = true,
                Crafts = new List<string>()
            };
            db.TeamMembers.Add(member);
        }

        if (!string.IsNullOrEmpty(request.GoogleSub))
            member.ExternalSubjectId = request.GoogleSub;

        request.Status = "Approved";
        request.ReviewedByMemberId = reviewerId;
        request.ReviewedAt = DateTimeOffset.UtcNow;
        request.ReviewNotes = input.Notes;

        // Adds the chosen squad to whatever the member already has. Approval places someone *into* a
        // squad; it is not a statement that this is now their only one, so a reactivated member keeps
        // the memberships they had. Writes through SquadService so one code path still owns SquadMember.
        if (squad is not null)
            await squads.AddMemberToSquadAsync(member.Id, squad.Id, save: false);

        // One save for the whole approval. SetMemberSquadsAsync is told not to save its own work for
        // exactly this reason: a second, separate save could fail after access was already granted,
        // leaving a member with access and no squad.
        await db.SaveChangesAsync();

        return new ApprovalResult(ApprovalOutcome.Success, member.Id, reactivated);
    }
}
