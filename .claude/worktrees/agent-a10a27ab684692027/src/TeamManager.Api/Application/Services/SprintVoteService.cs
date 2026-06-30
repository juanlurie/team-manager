using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Vote;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class SprintVoteService(AppDbContext db) : ISprintVoteService
{
    private const string MvpKey = "sprint-mvp";

    public async Task<SprintVotesResponse> GetVotesAsync(Guid sprintId)
    {
        var votes = await db.SprintVotes
            .Include(v => v.Voter).ThenInclude(sm => sm.TeamMember)
            .Include(v => v.Nominee).ThenInclude(sm => sm.TeamMember)
            .Where(v => v.SprintId == sprintId)
            .ToListAsync();

        var members = await db.SprintMembers
            .Include(sm => sm.TeamMember)
            .Where(sm => sm.SprintId == sprintId)
            .OrderBy(sm => sm.TeamMember.FirstName).ThenBy(sm => sm.TeamMember.LastName)
            .ToListAsync();

        var mvpAwardedMemberIds = await db.MemberAchievements
            .Include(ma => ma.Achievement)
            .Where(ma => ma.Achievement.Key == MvpKey)
            .Select(ma => ma.TeamMemberId)
            .ToListAsync();

        var tally = members.Select(sm => new VoteTallyDto(
            sm.Id,
            $"{sm.TeamMember.FirstName} {sm.TeamMember.LastName}",
            votes.Count(v => v.NomineeSprintMemberId == sm.Id),
            mvpAwardedMemberIds.Contains(sm.TeamMemberId)
        )).OrderByDescending(t => t.Votes).ThenBy(t => t.MemberName).ToList();

        var voteDtos = votes.Select(ToDto).ToList();

        return new SprintVotesResponse(voteDtos, tally);
    }

    public async Task<SprintVoteDto> CastVoteAsync(Guid sprintId, CastVoteRequest request)
    {
        var existing = await db.SprintVotes
            .FirstOrDefaultAsync(v => v.SprintId == sprintId && v.VoterSprintMemberId == request.VoterSprintMemberId);

        if (existing is not null)
        {
            existing.NomineeSprintMemberId = request.NomineeSprintMemberId;
            await db.SaveChangesAsync();
            return await LoadAndMapVote(existing.Id);
        }

        var vote = new SprintVote
        {
            SprintId = sprintId,
            VoterSprintMemberId = request.VoterSprintMemberId,
            NomineeSprintMemberId = request.NomineeSprintMemberId
        };
        db.SprintVotes.Add(vote);
        await db.SaveChangesAsync();
        return await LoadAndMapVote(vote.Id);
    }

    public async Task<VoteTallyDto> AwardMvpAsync(Guid sprintId)
    {
        var votes = await db.SprintVotes
            .Where(v => v.SprintId == sprintId)
            .ToListAsync();

        if (votes.Count == 0)
            throw new InvalidOperationException("No votes cast for this sprint.");

        var topNomineeSMId = votes
            .GroupBy(v => v.NomineeSprintMemberId)
            .OrderByDescending(g => g.Count())
            .First().Key;

        var sm = await db.SprintMembers
            .Include(s => s.TeamMember)
            .FirstAsync(s => s.Id == topNomineeSMId);

        var achievement = await db.Achievements.FirstOrDefaultAsync(a => a.Key == MvpKey);
        if (achievement is null)
        {
            achievement = new Achievement
            {
                Key = MvpKey,
                Name = "Sprint MVP",
                Description = "Voted most valuable player for the sprint by the team.",
                Icon = "🏆",
                Category = "Performance",
                Points = 50
            };
            db.Achievements.Add(achievement);
            await db.SaveChangesAsync();
        }

        db.MemberAchievements.Add(new MemberAchievement
        {
            TeamMemberId = sm.TeamMemberId,
            AchievementId = achievement.Id,
            Note = "Sprint MVP",
            AwardedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();

        return new VoteTallyDto(
            topNomineeSMId,
            $"{sm.TeamMember.FirstName} {sm.TeamMember.LastName}",
            votes.Count(v => v.NomineeSprintMemberId == topNomineeSMId),
            true);
    }

    private async Task<SprintVoteDto> LoadAndMapVote(Guid voteId)
    {
        var v = await db.SprintVotes
            .Include(x => x.Voter).ThenInclude(sm => sm.TeamMember)
            .Include(x => x.Nominee).ThenInclude(sm => sm.TeamMember)
            .FirstAsync(x => x.Id == voteId);
        return ToDto(v);
    }

    private static SprintVoteDto ToDto(SprintVote v) => new(
        v.Id,
        v.VoterSprintMemberId,
        $"{v.Voter.TeamMember.FirstName} {v.Voter.TeamMember.LastName}",
        v.NomineeSprintMemberId,
        $"{v.Nominee.TeamMember.FirstName} {v.Nominee.TeamMember.LastName}");
}
