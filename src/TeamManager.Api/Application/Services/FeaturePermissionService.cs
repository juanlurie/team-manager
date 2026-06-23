using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.FeaturePermissions;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class FeaturePermissionService : IFeaturePermissionService
{
    private readonly AppDbContext db;

    public FeaturePermissionService(AppDbContext db)
    {
        this.db = db;
    }

    private static readonly string[] AllRoles = ["Member", "TeamLead", "TechLead"];

    public async Task<List<FeatureCategoryGroup>> GetAllRolePermissionsAsync()
    {
        var dbPermissions = await db.FeaturePermissions.ToListAsync();
        var dbMap = dbPermissions.ToDictionary(p => (p.FeatureKey, p.Role));

        var allFeatures = GetAllFeatureDefinitions();

        var all = allFeatures
            .SelectMany(f => AllRoles.Select(role =>
            {
                if (dbMap.TryGetValue((f.Key, role), out var existing))
                    return new FeaturePermissionDto(existing.Id, existing.FeatureKey, existing.Category, existing.Label, existing.Role, existing.IsEnabled);
                return new FeaturePermissionDto(Guid.Empty, f.Key, f.Category, f.Label, role, true);
            }))
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Label)
            .ToList();

        var groups = all
            .GroupBy(p => p.Category)
            .Select(g => new FeatureCategoryGroup(g.Key, g.ToList()))
            .ToList();

        return groups;
    }

    public async Task UpdateRolePermissionAsync(string featureKey, string role, bool isEnabled)
    {
        var permission = await db.FeaturePermissions
            .FirstOrDefaultAsync(p => p.FeatureKey == featureKey && p.Role == role);

        if (permission == null)
        {
            var featureDef = GetFeatureDefinition(featureKey);
            permission = new FeaturePermission
            {
                FeatureKey = featureKey,
                Category = featureDef?.Category ?? "Other",
                Label = featureDef?.Label ?? featureKey,
                Role = role,
                IsEnabled = isEnabled
            };
            db.FeaturePermissions.Add(permission);
        }
        else
        {
            permission.IsEnabled = isEnabled;
        }

        await db.SaveChangesAsync();
    }

    public async Task<List<MemberFeatureOverrideDto>> GetMemberOverridesAsync(Guid memberId)
    {
        var member = await db.TeamMembers.FindAsync(memberId);
        if (member == null) throw new KeyNotFoundException("Member not found.");

        var role = member.Role.ToString();
        var allFeatures = GetAllFeatureDefinitions();
        var overrides = await db.MemberFeatureOverrides
            .Where(o => o.TeamMemberId == memberId)
            .ToListAsync();

        var rolePermissions = await db.FeaturePermissions
            .Where(p => p.Role == role)
            .ToListAsync();

        var roleMap = rolePermissions.ToDictionary(p => p.FeatureKey, p => p.IsEnabled);
        var overrideMap = overrides.ToDictionary(o => o.FeatureKey, o => o.IsEnabled);

        var result = allFeatures.Select(f =>
        {
            var hasOverride = overrideMap.ContainsKey(f.Key);
            var hasRolePerm = roleMap.TryGetValue(f.Key, out var roleEnabled);
            var effectiveEnabled = hasOverride ? overrideMap[f.Key] : (!hasRolePerm || roleEnabled);

            return new MemberFeatureOverrideDto(
                hasOverride ? overrides.First(o => o.FeatureKey == f.Key).Id : Guid.Empty,
                f.Key,
                f.Category,
                f.Label,
                effectiveEnabled,
                !hasOverride
            );
        }).ToList();

        return result;
    }

    public async Task UpdateMemberOverrideAsync(Guid memberId, string featureKey, bool isEnabled)
    {
        var existing = await db.MemberFeatureOverrides
            .FirstOrDefaultAsync(o => o.TeamMemberId == memberId && o.FeatureKey == featureKey);

        if (existing != null)
        {
            existing.IsEnabled = isEnabled;
        }
        else
        {
            db.MemberFeatureOverrides.Add(new MemberFeatureOverride
            {
                TeamMemberId = memberId,
                FeatureKey = featureKey,
                IsEnabled = isEnabled
            });
        }

        await db.SaveChangesAsync();
    }

    public async Task RemoveMemberOverrideAsync(Guid memberId, string featureKey)
    {
        var existing = await db.MemberFeatureOverrides
            .FirstOrDefaultAsync(o => o.TeamMemberId == memberId && o.FeatureKey == featureKey);

        if (existing != null)
        {
            db.MemberFeatureOverrides.Remove(existing);
            await db.SaveChangesAsync();
        }
    }

    private static readonly HashSet<string> DefaultOffFeatures = ["wow-host", "polls-host", "quiz-game-host", "settings", "api-keys", "access-requests", "showcase", "export"];

    public async Task<bool> IsFeatureEnabledForMemberAsync(Guid memberId, string featureKey)
    {
        var member = await db.TeamMembers.FindAsync(memberId);
        if (member == null) return false;

        var role = member.Role.ToString();

        var overrideEntry = await db.MemberFeatureOverrides
            .FirstOrDefaultAsync(o => o.TeamMemberId == memberId && o.FeatureKey == featureKey);

        if (overrideEntry != null)
            return overrideEntry.IsEnabled;

        var rolePermission = await db.FeaturePermissions
            .FirstOrDefaultAsync(p => p.FeatureKey == featureKey && p.Role == role);

        if (rolePermission != null)
            return rolePermission.IsEnabled;

        return !DefaultOffFeatures.Contains(featureKey);
    }

    private static FeatureDef? GetFeatureDefinition(string featureKey)
    {
        return GetAllFeatureDefinitions().FirstOrDefault(f => f.Key == featureKey);
    }

    private static List<FeatureDef> GetAllFeatureDefinitions()
    {
        return new List<FeatureDef>
        {
            new("dashboard", "Core", "Dashboard"),
            new("sprints", "Core", "Sprints"),
            new("features", "Core", "Features"),
            new("progress", "Core", "Progress"),
            new("discussion", "Collaboration", "Discussion"),
            new("meetings", "Collaboration", "Meetings"),
            new("fun-hub", "Fun Hub", "Fun Hub"),
            new("coffee-run", "Fun Hub", "Coffee Run"),
            new("jokes", "Fun Hub", "Jokes"),
            new("scrum-poker", "Fun Hub", "Scrum Poker"),
            new("wheel", "Fun Hub", "Spin Wheel"),
            new("leaderboard", "Fun Hub", "Leaderboard"),
            new("win-of-week", "Fun Hub", "Win of the Week"),
            new("win-of-month", "Fun Hub", "Win of the Month"),
            new("wow-host", "Fun Hub", "Win of the Week — Host"),
            new("polls", "Fun Hub", "Polls"),
            new("polls-host", "Fun Hub", "Polls — Host"),
            new("quiz-game", "Fun Hub", "Quiz Game"),
            new("quiz-game-host", "Fun Hub", "Quiz Game — Host"),
            new("team", "Team", "Team Management"),
            new("leave", "Team", "Leave"),
            new("expense-claim", "Team", "Expense Claim"),
            new("export", "Admin", "Export"),
            new("settings", "Admin", "Settings"),
            new("api-keys", "Admin", "API Keys"),
            new("access-requests", "Admin", "Access Requests"),
            new("showcase", "Admin", "Features Showcase"),
        };
    }

    private record FeatureDef(string Key, string Category, string Label);
}
