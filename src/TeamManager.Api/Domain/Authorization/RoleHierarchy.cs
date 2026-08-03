using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Authorization;

/// <summary>
/// The one definition of role precedence. "Admin has all permissions" is a property of the system
/// only if every place that emits role claims expands through here — there are exactly two
/// (<see cref="Middleware.TeamMemberClaimsTransformer"/> for interactive logins,
/// <see cref="Middleware.ApiKeyAuthenticationHandler"/> for keys) and nothing else may encode
/// precedence.
///
/// Expanding at claim time rather than at the call site is deliberate: the alternative is writing
/// <c>Roles = "TeamLead,Admin"</c> on ~30 <c>[Authorize]</c> attributes, where missing one silently
/// locks Admins out of a feature and every new controller is a fresh chance to forget.
/// </summary>
public static class RoleHierarchy
{
    /// <summary>
    /// What each role implies beyond itself. Only Admin implies anything today.
    ///
    /// TechLead is deliberately absent: it is a role *within* a team with no management
    /// significance, so it is a sibling of TeamLead, not a tier below it. Admin does not imply it
    /// either — the checks that pair the two (<c>IsInRole("TeamLead") || IsInRole("TechLead")</c>)
    /// are satisfied by the TeamLead claim already, and claiming TechLead would put Admins in
    /// "who are the tech leads" lists where they don't belong.
    /// </summary>
    private static readonly IReadOnlyDictionary<MemberRole, MemberRole[]> Implied =
        new Dictionary<MemberRole, MemberRole[]>
        {
            [MemberRole.Admin] = [MemberRole.TeamLead],
        };

    /// <summary>
    /// The full set of role names a member holding <paramref name="role"/> should be granted —
    /// always including the role itself, so a role missing from the map still authorises itself.
    /// </summary>
    public static IReadOnlyList<string> Expand(MemberRole role)
    {
        var names = new List<string> { role.ToString() };
        if (Implied.TryGetValue(role, out var implied))
            names.AddRange(implied.Select(r => r.ToString()));
        return names;
    }
}
