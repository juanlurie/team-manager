using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.FeaturePermissions;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class FeaturePermissionService : IFeaturePermissionService
{
    private readonly AppDbContext db;

    public FeaturePermissionService(AppDbContext db)
    {
        this.db = db;
    }

    // Derived, never restated: a role added to the enum shows up in the settings matrix on its own.
    // The hand-maintained list is what made adding Admin a four-place edit (see the rollout plan's
    // "Gaps found" #4).
    private static readonly string[] AllRoles = Enum.GetNames<MemberRole>();

    private static readonly string AdminRole = nameof(MemberRole.Admin);

    public async Task<List<FeatureCategoryGroup>> GetAllRolePermissionsAsync()
    {
        var dbPermissions = await db.FeaturePermissions.ToListAsync();
        var dbMap = dbPermissions.ToDictionary(p => (p.FeatureKey, p.Role));

        var allFeatures = GetAllFeatureDefinitions();

        var all = allFeatures
            .SelectMany(f => AllRoles.Select(role =>
            {
                // Admin has every feature by definition, so its column reports enabled regardless
                // of what's stored. Reading a stored value here would let the matrix show a state
                // IsFeatureEnabledForMemberAsync ignores.
                if (role == AdminRole)
                    return new FeaturePermissionDto(Guid.Empty, f.Key, f.Category, f.Label, role, true);
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
        // Refused rather than stored-and-ignored: a row nothing reads is the "silently inert
        // permission" failure this file already has one of (gap 5 in the rollout plan).
        if (role == AdminRole)
            throw new InvalidOperationException("Admin has every feature by definition and cannot be restricted.");

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

        var allFeatures = GetAllFeatureDefinitions();

        // Same short-circuit as IsFeatureEnabledForMemberAsync, so the tab shows what the member
        // actually gets rather than role rows and overrides that no longer apply to them.
        if (member.Role == MemberRole.Admin)
            return allFeatures
                .Select(f => new MemberFeatureOverrideDto(Guid.Empty, f.Key, f.Category, f.Label, true, true))
                .ToList();

        var role = member.Role.ToString();
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
        var member = await db.TeamMembers.FindAsync(memberId);
        if (member is not null && member.Role == MemberRole.Admin)
            throw new InvalidOperationException("Admin has every feature by definition and cannot be restricted.");

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

    private static readonly HashSet<string> DefaultOffFeatures = ["wow-host", "polls-host", "quiz-game-host", "wordle-host", "settings", "api-keys", "access-requests", "showcase", "export"];

    public async Task<bool> IsFeatureEnabledForMemberAsync(Guid memberId, string featureKey)
    {
        var member = await db.TeamMembers.FindAsync(memberId);
        if (member == null) return false;

        // "Admin has all permissions" is answered here rather than by seeding an Admin row per
        // feature: seeded rows go stale the next time someone adds a feature, and this file's
        // default is fail-open for anything unseeded anyway.
        if (member.Role == MemberRole.Admin) return true;

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
            new("wordle", "Fun Hub", "Wordle"),
            new("wordle-host", "Fun Hub", "Wordle — Host"),
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
