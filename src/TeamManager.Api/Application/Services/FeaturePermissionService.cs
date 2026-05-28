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

    public async Task<List<FeatureCategoryGroup>> GetAllRolePermissionsAsync()
    {
        var permissions = await db.FeaturePermissions
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Label)
            .ToListAsync();

        var groups = permissions
            .GroupBy(p => p.Category)
            .Select(g => new FeatureCategoryGroup(
                g.Key,
                g.Select(p => new FeaturePermissionDto(p.Id, p.FeatureKey, p.Category, p.Label, p.Role, p.IsEnabled)).ToList()
            ))
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

        var overrideMap = overrides.ToDictionary(o => o.FeatureKey, o => o.IsEnabled);

        var result = allFeatures.Select(f => new MemberFeatureOverrideDto(
            overrideMap.ContainsKey(f.Key) ? overrides.First(o => o.FeatureKey == f.Key).Id : Guid.Empty,
            f.Key,
            f.Category,
            f.Label,
            overrideMap.ContainsKey(f.Key) ? overrideMap[f.Key] : true,
            !overrideMap.ContainsKey(f.Key)
        )).ToList();

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

        return true;
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
            new("scrum-poker", "Fun Hub", "Scrum Poker"),
            new("wheel", "Fun Hub", "Spin Wheel"),
            new("leaderboard", "Fun Hub", "Leaderboard"),
            new("win-of-week", "Fun Hub", "Win of the Week"),
            new("team", "Team", "Team Management"),
            new("leave", "Team", "Leave"),
            new("export", "Admin", "Export"),
            new("settings", "Admin", "Settings"),
            new("api-keys", "Admin", "API Keys"),
            new("access-requests", "Admin", "Access Requests"),
        };
    }

    private record FeatureDef(string Key, string Category, string Label);
}
