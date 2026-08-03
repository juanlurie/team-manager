# Team & Admin Rollout

Goal: introduce a **Team** entity above Squad, let access-request approval place
a new member into a squad (and therefore a team), add an **Admin** role that
genuinely has all permissions, and close the role-gate gaps found along the way.

Four workstreams, shipped in the order below. A and D are security fixes and do
not depend on the schema work.

---

## Domain model

- **Team** — an organisational unit. Contains squads.
- **Squad** — belongs to *at most one* team. `TeamId` is **optional**.
- **SquadMember** — unchanged. Many-to-many between squad and member.
- **A member's team is derived**: `TeamMember → SquadMember → Squad → Team`.
  There is deliberately **no** `TeamMember.TeamId`. Adding one creates a second
  source of truth that will drift from squad membership.

Consequence: `SquadMember` is many-to-many and
[`SetMemberSquadsAsync`](../src/TeamManager.Api/Application/Services/SquadService.cs)
takes a *list*, so a member can sit in several squads resolving to different
teams, one team, or none. "The member's team" is not a single well-defined value.

### A member's teams are a set, not a value

`TeamMemberDto` gains a plural `Teams` — an ordered, distinct list — and **never**
a singular `Team`/`TeamId`. Same reasoning as the absent `TeamMember.TeamId` one
level up: a singular field is a second source of truth that drifts from squad
membership. The plural shape is what stops one being added later.

The alternatives were considered and rejected:

- **First-by-name** invents a value the data doesn't hold, and it's unstable —
  renaming a team or adding a squad silently changes who someone "belongs to".
- **Ambiguous-as-unset** discards the information for exactly the people it
  matters for, the ones working across teams, and drops them out of *every*
  team's filter. Showing them under both is strictly better than under neither.

It also needs no new UI idiom: the member row already renders `squads` as chips
and the squad filter already matches with `.some()`.

Rules that follow, to hold to:

1. **Derivation** — distinct non-null `Squad.Team` across the member's squads,
   ordered by name. Squads with no team contribute nothing; they are not a
   "No team" pseudo-team.
2. **Filtering is any-match.** A member in two teams appears under both. The
   "No team" filter option means *the derived set is empty*, which includes
   members who are in no squad at all.
3. **Counting.** "Members per team" summed across teams can exceed headcount.
   Any aggregate needing one number per member counts squad memberships, or
   states the overlap — it does not get fixed by picking one team.
4. **One place a single team *is* well-defined**: D's approval flow, where the
   reviewer picks exactly one squad, so `squad.TeamId` is unambiguous. That is
   "the team implied by this assignment", not "the member's team" — it must not
   be reused as the latter.

### Roles

| Role | Meaning |
|---|---|
| `Member` | Baseline. |
| `TechLead` | A role *within* a team. **No management significance.** |
| `TeamLead` | Management. Oversees members across many squads, with access to **all** members — assign, see, engage, approve, add. Not scoped to one team. |
| `Admin` | All permissions. |

Because TeamLead access is global, there is no per-team scoping anywhere in this
plan, and no TeamLead↔Team association is required. If a Team detail view later
wants to show "who leads this", a `TeamLead` join table can be added then — it's
a standalone table with no data migration, so deferring costs nothing.

### Who can change roles

| Actor | May assign |
|---|---|
| `TeamLead` | `Member`, `TechLead`, `TeamLead` |
| `Admin` | All roles, including granting and revoking `Admin` |

**Only an Admin can grant or revoke Admin.** This is what keeps the tiers
meaningful — if a TeamLead could grant Admin, then every TeamLead is already
effectively an Admin and the distinction is cosmetic.

It also makes the **last-Admin guard** load-bearing rather than decorative:
because only an Admin can create an Admin, demoting the final Admin is
**unrecoverable from inside the app** and would need database surgery. The role
endpoint must refuse any change that would take the Admin count to zero,
including an Admin demoting themselves.

The role endpoint therefore cannot be a flat `[Authorize(Roles = "TeamLead")]`.
It needs a body check: reject when the *target* role is `Admin`, or the target
member currently *is* an Admin, unless the caller is an Admin.

---

## A. Privilege-escalation fix — ship first

[`TeamMembersController.Update`](../src/TeamManager.Api/Presentation/Controllers/TeamMembersController.cs)
is gated only by `[RequireFeature("team")]` — no role attribute — and its
`UpdateTeamMemberRequest` carries `[Required] MemberRole Role`.
`"team"` is **not** in `DefaultOffFeatures`, so absent an explicit matrix row,
[`IsFeatureEnabledForMemberAsync`](../src/TeamManager.Api/Application/Services/FeaturePermissionService.cs)
returns `true` for a plain Member.

**Any authenticated member can PUT their own record with `Role: "TeamLead"` and
promote themselves**, unless the deployment has explicitly disabled the `team`
feature for Member. Adding Admin raises the ceiling.

Fix:

- Split role assignment into `PUT /api/teammembers/{id}/role`, gated
  `[Authorize(Roles = "TeamLead")]` **plus** the in-body escalation check from
  *Who can change roles* above: a caller who is not an Admin may neither grant
  `Admin` nor modify a member who currently holds it. The attribute alone is not
  sufficient here.
- **Remove** `Role` from `UpdateTeamMemberRequest` and `CreateTeamMemberRequest`
  rather than merely ignoring it — dropping the field is what stops it coming
  back.
- Add the **last-Admin guard**: refuse any change taking the Admin count to zero.
- Add an **audit row** for role changes (`ApiSyncEvent` / `WorkItemEvent` are the
  existing precedents). "Who made this person an Admin, when" is worth recording.

### UI

The role `mat-select` in `team-member-form` currently posts role as part of the
general member save. Once `Role` leaves that DTO it must move:

- Remove the role control from the create/edit form's normal save path.
- Add a distinct **Change role** action (member list row menu or member detail),
  calling the new endpoint on its own.
- Hide `Admin` from the options when the current user is not an Admin, and
  disable the action entirely against a member who is an Admin. This mirrors the
  server check — it is UX, not the boundary, but it stops users hitting an
  avoidable 403.
- Surface the last-Admin refusal as a readable message rather than a bare error.

Files:
[TeamMembersController.cs](../src/TeamManager.Api/Presentation/Controllers/TeamMembersController.cs),
[UpdateTeamMemberRequest.cs](../src/TeamManager.Api/Application/DTOs/TeamMember/UpdateTeamMemberRequest.cs),
[CreateTeamMemberRequest.cs](../src/TeamManager.Api/Application/DTOs/TeamMember/CreateTeamMemberRequest.cs),
the `TeamMemberService` update path, and
[team-member-form.component.ts](../team-manager-ui/src/app/features/team/team-member-form/team-member-form.component.ts)
which posts the role today.

Migration: **`AddMemberRoleChangeAudit`** — the audit row needs somewhere to live, so A does
carry one after all (a `MemberRoleChanges` table; purely additive, trivial `Down`). The rest of
A is schema-free.

A also lands B's `Admin` enum value ahead of schedule: the escalation check and the last-Admin
guard are written in terms of it, so it cannot be deferred. Nothing else of B moves with it —
`Admin` stays unreachable (only an Admin can grant Admin, and A's bootstrap still makes a
`TeamLead`) until B1 lands the implied-role claim, the feature-gate short-circuit and the
`Admin` bootstrap, and B2 the UI sweep.

---

## B. Admin role

Split in two. **B1** is the authorization boundary — who is implicitly who, and what
"all permissions" actually means at the gate. **B2** is the frontend sweep, which is
broad but mechanical: the role is stringly-typed throughout, so making the derived
lists derive turns the compiler into the checklist.

### B1 — enum, hierarchy, claims, feature gating

**Enum** — append `Admin` to
[MemberRole.cs](../src/TeamManager.Api/Domain/Enums/MemberRole.cs). Safe:
[TeamMemberConfiguration.cs](../src/TeamManager.Api/Infrastructure/Data/Configurations/TeamMemberConfiguration.cs)
persists it via `HasConversion<string>()`, so there is no ordinal to disturb and
no data migration. *(Landed early with A — the escalation check and last-Admin
guard are written in terms of it.)*

**Implied roles — the load-bearing change.**
[TeamMemberClaimsTransformer.cs](../src/TeamManager.Api/Middleware/TeamMemberClaimsTransformer.cs)
emits exactly one role claim, `tm.Role.ToString()`. An Admin would get
`role=Admin` and fail all ~30 `[Authorize(Roles = "TeamLead")]` sites — an Admin
who can do *less* than a lead. Emit the transitive set instead:
`Admin → {Admin, TeamLead}`. All existing attributes keep working, every future
controller inherits it.

The map itself lives in
[RoleHierarchy.cs](../src/TeamManager.Api/Domain/Authorization/RoleHierarchy.cs)
and is the only thing in the system encoding precedence. There are **two**
claim emitters, not one:
[ApiKeyAuthenticationHandler](../src/TeamManager.Api/Middleware/ApiKeyAuthenticationHandler.cs)
also emits `role` and the transformer returns early for `AuthMethod=ApiKey`, so a
key issued to an Admin would otherwise be refused everywhere a TeamLead is
required. Both expand through the same map.

`Admin → TeamLead` only. Admin does **not** imply TechLead: the checks that pair
the two (`IsInRole("TeamLead") || IsInRole("TechLead")`) are already satisfied by
the TeamLead claim, and claiming TechLead would put Admins in "who are the tech
leads" lists where they don't belong.

Do **not** rewrite the call sites to `Roles = "TeamLead,Admin"`. That is 30+
edits where missing one silently locks Admins out of a feature, and every new
controller is a fresh chance to forget.

**Feature gating** — short-circuit Admin to `true` in
[`IsFeatureEnabledForMemberAsync`](../src/TeamManager.Api/Application/Services/FeaturePermissionService.cs)
rather than seeding an `Admin` row per feature; seeded rows go stale the next
time someone adds a feature. Derive `AllRoles` in the same file from
`Enum.GetNames<MemberRole>()` — restating it is gap 4, and the settings matrix
then grows the column on its own.

That short-circuit makes stored Admin permissions unreadable, so the write paths
**refuse** rather than store-and-ignore (`UpdateRolePermissionAsync` for the
`Admin` role, `UpdateMemberOverrideAsync` against an Admin member; both surface
as 400). A row nothing reads is exactly gap 5. The reads match: the matrix and
the member permissions tab report Admin as enabled regardless of what's in the
table, and the UI renders those toggles checked and disabled.

**Bootstrap user** — the first-ever login becomes `Admin`, not `TeamLead`. Only
an Admin can grant Admin, so bootstrapping a TeamLead leaves a fresh deployment
unable to reach the role at all. (Open question 3, resolved.)

Dev mode (`DevelopmentAuthHandler`) carries both role claims: it is deliberately
unrestricted, and the transformer never runs there.

### B2 — frontend sweep

Role is stringly-typed throughout; miss one and Admin silently degrades to
Member. Make the derived lists actually derive and the compiler finds the rest:

- [team-member.model.ts](../team-manager-ui/src/app/core/models/team-member.model.ts) — union type, `MEMBER_ROLES`, `roleLabel()` *(landed with A)*
- [feature-permissions.model.ts](../team-manager-ui/src/app/core/models/feature-permissions.model.ts) — `ROLES` derives from `MEMBER_ROLES`; the hardcoded `<th>`/`<col>` columns in [feature-permissions.component.html](../team-manager-ui/src/app/features/settings/feature-permissions/feature-permissions.component.html) render from that list, with the Admin column checked and disabled
- [auth.service.ts](../team-manager-ui/src/app/core/auth/auth.service.ts) and [self-or-lead.guard.ts](../team-manager-ui/src/app/core/guards/self-or-lead.guard.ts) — both tested `TeamLead || TechLead`; Admin joins `isLead()` and the guard defers to `isSelfOrLead()` instead of restating it
- **Badge styling** in [team-list.component.ts](../team-manager-ui/src/app/features/team/team-list/team-list.component.ts) — `.role-admin` alongside the existing three
- `leaderboard.component.ts` had its own inline `'TeamLead' → 'Team Lead'`; uses `roleLabel()` now

Left alone deliberately: the filters that pick *who can be someone's lead*
(`wheel`, `leave-overview`, `k-picker`, the team-lead dropdown in
`team-member-form`, `getAll({ role: 'TeamLead' })` in sprints/export). Those
answer a roster question, not a permission one; putting Admins in them is a
separate product decision.

No migration.

---

## C. Team schema

### New files

| File | Contents |
|---|---|
| `src/TeamManager.Api/Domain/Entities/Team.cs` | `Id`, `Name`, `ICollection<Squad> Squads` |
| `src/TeamManager.Api/Infrastructure/Data/Configurations/TeamConfiguration.cs` | Key, `gen_random_uuid()` default, `Name` max 100 required, unique index on `Name` |

`TeamConfiguration` mirrors
[SquadConfiguration.cs](../src/TeamManager.Api/Infrastructure/Data/Configurations/SquadConfiguration.cs)
idiom for idiom.

### Modified

- [Squad.cs](../src/TeamManager.Api/Domain/Entities/Squad.cs) — `Guid? TeamId`, `Team? Team`.
- [SquadConfiguration.cs](../src/TeamManager.Api/Infrastructure/Data/Configurations/SquadConfiguration.cs) —
  `HasOne`/`WithMany`/`HasForeignKey` with **`DeleteBehavior.SetNull`**.
  It must **not** cascade: `SquadMember` already cascades from `Squad`
  ([SquadMemberConfiguration.cs](../src/TeamManager.Api/Infrastructure/Data/Configurations/SquadMemberConfiguration.cs)),
  so a cascading team delete would silently wipe every squad membership beneath it.
- [AppDbContext.cs](../src/TeamManager.Api/Infrastructure/Data/AppDbContext.cs) —
  `DbSet<Team>` beside the Squad sets, `ApplyConfiguration(new TeamConfiguration())`.
- [SquadDto.cs](../src/TeamManager.Api/Application/DTOs/Squad/SquadDto.cs) —
  `Guid? TeamId` and `string? TeamName` on `SquadDto`/`SquadSummaryDto`;
  `Guid? TeamId` on `CreateSquadRequest`.
- [SquadService.cs](../src/TeamManager.Api/Application/Services/SquadService.cs) —
  set in create/update, project in both `ToDto`s, `.Include(s => s.Team)` on both
  query chains.
- [TeamMemberDto.cs](../src/TeamManager.Api/Application/DTOs/TeamMember/TeamMemberDto.cs) —
  `IReadOnlyList<TeamSummaryDto> Teams`, beside the existing `Squads`. Plural, per
  *A member's teams are a set*.
- [TeamMemberService.cs](../src/TeamManager.Api/Application/Services/TeamMemberService.cs) —
  `.ThenInclude(s => s.Team)` on the two query chains that already include
  `SquadMemberships.Squad`, and the derivation in `ToDto`: distinct non-null
  `Squad.Team`, ordered by name. Deriving server-side is what keeps the rule in
  one place instead of in every component that displays it.

**`SquadMember` is untouched.**

### Migration

Name: **`AddTeamEntityAndSquadTeamFk`**

```
./dev.sh migrate:add AddTeamEntityAndSquadTeamFk
```

There is **no local .NET SDK** on this machine — `dev.sh` runs the EF tooling in
a one-off SDK container. `dotnet ef …` directly will fail. Same for tests:
`./dev.sh test`.

Purely additive — create the table, add a nullable FK column. No backfill, no
seed team, trivial `Down`, safe to deploy ahead of the code that uses it.

### API

Teams **are** user-manageable, so this workstream includes `TeamService` +
`TeamsController` with list / create / rename / delete, mirroring
[SquadsController](../../src/TeamManager.Api/Presentation/Controllers/SquadsController.cs)
— but gated `[Authorize(Roles = "TeamLead")]` from the start, which
SquadsController is missing (see workstream D).

Delete semantics follow `SetNull`: deleting a team detaches its squads rather
than deleting them. The UI must say so before confirming.

### UI

Without this, C ships a table and a column nothing can touch, and D's squad
picker would assign a team nobody can see.

- **New `team-manager-dialog` component**, sibling to
  [squad-manager-dialog](../../team-manager-ui/src/app/features/team/squad-manager-dialog/squad-manager-dialog.component.ts):
  list, inline create, rename, delete. Reached from the same overflow menu in
  `team-list` that opens "Manage squads".
  Per [CLAUDE.md](../../CLAUDE.md)'s component rule this is its **own**
  component — `squad-manager-dialog` already carries list + inline create +
  inline edit + member picker, and must not absorb team management too.
- **Team picker per squad** in `squad-manager-dialog` — a dropdown in the squad
  header row, including an explicit "No team" option since `TeamId` is optional.
- **`team-list`**: a Team filter alongside the existing Squad filter, and teams
  shown on each member row. Per *A member's teams are a set*: render every
  distinct team, mirroring how squad chips already render; filter is any-match
  with an explicit "No team" option for the empty set. `TeamMemberDto` carries
  `Teams` (plural) — the API does the deriving, not the component.
- **New `Team` / `TeamSummary` models** and a `TeamService` in
  `team-manager-ui/src/app/core/`, mirroring the existing squad model/service pair.
- `SquadDto` gaining `teamId`/`teamName` means the squad model in
  `core/models/squad.model.ts` needs the same fields.

---

## D. Squad-on-approval + role gates

### Extract first

[`AccessRequestsController.Approve`](../src/TeamManager.Api/Presentation/Controllers/AccessRequestsController.cs)
is ~78 inline lines with two independent `SaveChangesAsync` branches
(reactivate-existing, create-new) and a duplicated broadcast block. Bolting
squad assignment onto that means writing it twice and getting it wrong once.

Extract to `src/TeamManager.Api/Application/Services/AccessRequestApprovalService.cs`,
then:

1. Widen `ApproveDto` to `(string? Notes, Guid? TeamMemberId, Guid? SquadId)`.
   The reviewer chooses at approve time. The anonymous `Submit` endpoint must
   **not** set it — unauthenticated input must not write org structure. (A
   `RequestedSquadId` *hint* the reviewer confirms is a reasonable later addition.)
2. **Null `SquadId` is normal, not an error** — skip assignment entirely. Do not
   call `SetMemberSquadsAsync` with an empty list; on the reactivate branch that
   would clear the member's existing memberships.
3. Validate only when present (squad must exist → 400). Read `squad.TeamId`;
   never accept a team id from the client.
4. Apply to **both** branches — a reactivated member needs assignment as much as
   a newly created one. This is the payoff of the extraction.
5. Write through
   [`SquadService.SetMemberSquadsAsync`](../src/TeamManager.Api/Application/Services/SquadService.cs),
   not a raw `db.SquadMembers.Add` — one code path owns `SquadMember` writes. It
   self-saves, so wrap the approval in an explicit transaction or add a no-save
   overload; otherwise a failed squad write leaves a member with access and no squad.
6. Keep `guestAllowed: true` on the approval broadcast and its explanatory
   comment — load-bearing for the requester's waiting screen.

### Role gates

`[Authorize(Roles = "TeamLead")]` on **approve**, **deny** and **list** in
[AccessRequestsController.cs](../src/TeamManager.Api/Presentation/Controllers/AccessRequestsController.cs).

- Bare `[Authorize]` is identical to the global `FallbackPolicy` in
  [Program.cs](../src/TeamManager.Api/Program.cs) — it reads as a gate but
  restricts nothing.
- `list` currently returns every requester's name, email, `googleSub` and
  free-text reason to any authenticated user.
- TechLead is **excluded** — no management significance.
- Admin passes automatically via the implied claim from workstream B.
- `Submit` stays `[AllowAnonymous]` — it is the public entry point.

Note: the class-level `[RequireFeature("access-requests")]` defaults *closed*
(`"access-requests"` is in `DefaultOffFeatures`), so this is latent rather than
live — it opens if someone enables that feature for Member in the settings
matrix. The role attribute belongs there regardless; a UI toggle is not an
authorization boundary.

Also in scope: [SquadsController.cs](../src/TeamManager.Api/Presentation/Controllers/SquadsController.cs)
has **no** role attribute at all — any authenticated member can create, rename
and delete squads and rewrite anyone's memberships. Once squads carry `TeamId`
that becomes org-structure tampering.

### UI

[approve-access-request-dialog.component.ts](../team-manager-ui/src/app/features/access-requests/approve-access-request-dialog.component.ts)
already has the create-new / link-existing radio and member autocomplete. Add:

- a squad `mat-select` visible in **both** modes, fed by the existing `SquadService`,
  with an explicit "No squad" option;
- the resolved team name shown read-only, so reviewers see the consequence;
- `squadId` on `ApproveAccessRequestDialogResult`;
- Approve button **never** blocked on squad selection.

Thread through
[access-requests.service.ts](../team-manager-ui/src/app/core/services/access-requests.service.ts)
and
[access-requests.component.ts](../team-manager-ui/src/app/features/access-requests/access-requests.component.ts).

---

## Gaps found

1. **Self-promotion via the member update endpoint** — workstream A. Live.
2. **Feature flags are being used as authorization.** `RequireFeature` is the
   only gate on several privileged endpoints. It is a visibility/rollout
   mechanism whose state is editable from a settings screen — a different thing
   from a privilege boundary, with different failure modes.
3. **Feature checks fail open.** `IsFeatureEnabledForMemberAsync` returns `true`
   for any feature not in the hardcoded `DefaultOffFeatures` deny-list. Every new
   feature is world-readable until someone remembers to add it. Deny-lists don't
   scale; allow-lists do.
4. **The role list is duplicated in four places** — the C# enum, `AllRoles` in
   `FeaturePermissionService`, `ROLES` in `feature-permissions.model.ts`, and
   hardcoded `<th>` columns. Adding Admin means touching all four and nothing
   fails if you miss one.
5. **`FeaturePermission.Role` is an unvalidated string** — a typo'd row is
   silently inert forever.
6. **`IsInRole("TeamLead") || IsInRole("TechLead")` is copy-pasted** across
   `TeamMembersController`, `self-or-lead.guard.ts`, `auth.service.ts` and
   several components. Each is a place Admin must be added by hand.
7. **No audit trail on role changes.**
8. **No last-Admin guard.**

---

## Practices to hold to

**Separate the two questions.** *Is this feature turned on for you?* (feature
flag, config-driven, failing open is defensible) and *are you allowed to do
this?* (authorization, code-driven, must fail closed). Every privileged endpoint
gets **both** `[RequireFeature]` **and** `[Authorize(Roles = …)]`. Neither
substitutes for the other. This one rule prevents gaps 1 and 2 recurring.

**One definition of the role hierarchy.** A single static map
(`Admin ⊃ TeamLead ⊃ Member`) consumed by the claims transformer, and nothing
else encoding precedence. That is what makes "Admin has all permissions" a
property of the system rather than a promise maintained by hand across 30
attributes.

**Derive role lists, never restate them.** `Enum.GetNames<MemberRole>()` in
`FeaturePermissionService`; generate the TS union and `ROLES` from a shared
source, or at minimum add a test asserting the two lists match. Gap 4 is exactly
the failure this prevents, and workstream B triggers it.

**Role changes get their own endpoint, their own gate, their own audit row.**
Never a field on a general-purpose update DTO.

**Name predicates for intent, not membership.** `canManageMembers()` rather than
`role === 'TeamLead' || role === 'TechLead'`, defined once per side. When a role
is added you change one function instead of eight call sites — and the name
documents *why* TechLead is on the list, which nothing currently does.

**Server-side is the boundary.** The Angular guards are UX; the API attributes
are the control. Several of the gaps above are places where the UI hides an
action the API would happily perform.

---

## Open questions

1. **TechLead's placement.** It is described as a role *within* a team with no
   management weight, yet it sits in the same enum as the management roles and
   is bundled with TeamLead in several permission checks (guards, avatar update,
   k-picker filters). Those checks assert "is senior" while the domain says "is
   technical". Worth deciding whether TechLead belongs in `MemberRole` at all,
   or is really a per-team/per-squad attribute — before more code depends on the
   current shape.
Resolved: teams **are** user-manageable (C includes API + UI); role-granting
rules are settled under *Who can change roles*; the bootstrap user is now
`Admin` (was open question 3, closed by B1); multi-squad → multi-team is settled
under *A member's teams are a set, not a value* (was open question 2).

---

## Order

| # | Workstream | Migration | Notes |
|---|---|---|---|
| 1 | A — escalation fix + role endpoint | `AddMemberRoleChangeAudit` | Security. API + the role-control move in the member form |
| 2 | B1 — hierarchy, claims, feature gating | none | Auth claim change; the authorization boundary |
| 2 | B2 — frontend sweep | none | Broad but mechanical; derive the lists and follow the compiler |
| 3 | C — Team schema, API, UI | `AddTeamEntityAndSquadTeamFk` | Largest. Migration is additive and deployable ahead of the rest |
| 4 | D — approval assignment + role gates | none | Depends on C |

Every workstream except B carries UI. C carries the most: a new team-manager
dialog, a team picker on squads, and team display/filtering in the member list.

Each is a branch off fresh `main` per [CLAUDE.md](../CLAUDE.md), PR to `main`
via `gh pr create --base main`.
