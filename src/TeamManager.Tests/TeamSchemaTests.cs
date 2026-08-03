using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Squad;
using TeamManager.Api.Application.DTOs.Team;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using Xunit;

namespace TeamManager.Tests;

/// <summary>
/// Pins the two things in the Team schema that fail quietly: the SetNull delete behaviour (a
/// cascade here would wipe squad membership, since SquadMember cascades from Squad), and the
/// derivation of a member's teams as a distinct ordered *set* rather than a single value.
/// </summary>
public class TeamSchemaTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"team-{Guid.NewGuid()}")
            .Options);

    private static TeamMember Member() => new()
    {
        Id = Guid.NewGuid(),
        FirstName = "Test",
        LastName = "Member",
        Email = $"{Guid.NewGuid():N}@team.local",
        Role = MemberRole.Member,
        IsActive = true
    };

    // --- Delete behaviour ------------------------------------------------------------------

    [Fact]
    public void Squad_team_fk_is_set_null_never_cascade()
    {
        using var db = NewDb();

        var fk = db.Model.FindEntityType(typeof(Squad))!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == typeof(Team));

        // Asserted on the model rather than by deleting a row: this is the property that must
        // hold against the real database, where the FK constraint -- not the change tracker --
        // is what enforces it.
        Assert.Equal(DeleteBehavior.SetNull, fk.DeleteBehavior);
        Assert.False(fk.IsRequired);
    }

    [Fact]
    public void Squad_member_still_cascades_from_squad()
    {
        using var db = NewDb();

        var fk = db.Model.FindEntityType(typeof(SquadMember))!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == typeof(Squad));

        // This is *why* the team FK must be SetNull. If this ever stops being Cascade the
        // reasoning above changes; if the team FK ever becomes Cascade, deleting a team would
        // reach through here and silently wipe every membership beneath it.
        Assert.Equal(DeleteBehavior.Cascade, fk.DeleteBehavior);
    }

    // --- A member's teams are a set --------------------------------------------------------

    [Fact]
    public async Task Member_in_squads_across_two_teams_gets_both_ordered_by_name()
    {
        using var db = NewDb();
        var alpha = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        var zulu = new Team { Id = Guid.NewGuid(), Name = "Zulu" };
        var s1 = new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = zulu.Id };
        var s2 = new Squad { Id = Guid.NewGuid(), Name = "Squad Two", TeamId = alpha.Id };
        var m = Member();
        db.AddRange(alpha, zulu, s1, s2, m);
        db.AddRange(
            new SquadMember { Id = Guid.NewGuid(), SquadId = s1.Id, TeamMemberId = m.Id },
            new SquadMember { Id = Guid.NewGuid(), SquadId = s2.Id, TeamMemberId = m.Id });
        await db.SaveChangesAsync();

        var dto = await new TeamMemberService(db).GetByIdAsync(m.Id);

        Assert.Equal(["Alpha", "Zulu"], dto!.Teams.Select(t => t.Name));
    }

    [Fact]
    public async Task Two_squads_in_the_same_team_yield_one_team()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        var s1 = new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = team.Id };
        var s2 = new Squad { Id = Guid.NewGuid(), Name = "Squad Two", TeamId = team.Id };
        var m = Member();
        db.AddRange(team, s1, s2, m);
        db.AddRange(
            new SquadMember { Id = Guid.NewGuid(), SquadId = s1.Id, TeamMemberId = m.Id },
            new SquadMember { Id = Guid.NewGuid(), SquadId = s2.Id, TeamMemberId = m.Id });
        await db.SaveChangesAsync();

        var dto = await new TeamMemberService(db).GetByIdAsync(m.Id);

        Assert.Single(dto!.Teams);
        Assert.Equal(team.Id, dto.Teams[0].Id);
    }

    [Fact]
    public async Task Squad_without_a_team_contributes_nothing()
    {
        using var db = NewDb();
        // Not a "No team" pseudo-team -- an empty set. The filter option meaning "no team" is
        // defined as the derived set being empty, which also covers members in no squad at all.
        var loose = new Squad { Id = Guid.NewGuid(), Name = "Loose Squad", TeamId = null };
        var m = Member();
        db.AddRange(loose, m);
        db.Add(new SquadMember { Id = Guid.NewGuid(), SquadId = loose.Id, TeamMemberId = m.Id });
        await db.SaveChangesAsync();

        var dto = await new TeamMemberService(db).GetByIdAsync(m.Id);

        Assert.Empty(dto!.Teams);
        Assert.Single(dto.Squads);
        Assert.Null(dto.Squads[0].TeamId);
    }

    [Fact]
    public async Task Member_squads_carry_team_id_and_name()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = team.Id };
        var m = Member();
        db.AddRange(team, squad, m);
        db.Add(new SquadMember { Id = Guid.NewGuid(), SquadId = squad.Id, TeamMemberId = m.Id });
        await db.SaveChangesAsync();

        var dto = await new TeamMemberService(db).GetByIdAsync(m.Id);

        Assert.Equal(team.Id, dto!.Squads[0].TeamId);
        Assert.Equal("Alpha", dto.Squads[0].TeamName);
    }

    // --- Squad <-> team wiring -------------------------------------------------------------

    [Fact]
    public async Task Creating_a_squad_with_a_team_returns_the_team_name()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        db.Add(team);
        await db.SaveChangesAsync();

        var created = await new SquadService(db)
            .CreateAsync(new CreateSquadRequest { Name = "Squad One", TeamId = team.Id });

        Assert.Equal(team.Id, created.TeamId);
        Assert.Equal("Alpha", created.TeamName);
    }

    [Fact]
    public async Task A_squad_can_be_moved_out_of_its_team()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        db.Add(team);
        await db.SaveChangesAsync();
        var service = new SquadService(db);
        var created = await service.CreateAsync(new CreateSquadRequest { Name = "Squad One", TeamId = team.Id });

        var updated = await service.UpdateAsync(created.Id, new CreateSquadRequest { Name = "Squad One", TeamId = null });

        Assert.Null(updated!.TeamId);
        Assert.Null(updated.TeamName);
    }

    // --- TeamService -----------------------------------------------------------------------

    [Fact]
    public async Task Team_names_are_unique()
    {
        using var db = NewDb();
        var service = new TeamService(db);
        await service.CreateAsync(new CreateTeamRequest { Name = "Alpha" });

        var second = await service.CreateAsync(new CreateTeamRequest { Name = "  Alpha  " });

        Assert.Equal(TeamSaveOutcome.DuplicateName, second.Outcome);
    }

    [Fact]
    public async Task Renaming_onto_an_existing_name_is_refused()
    {
        using var db = NewDb();
        var service = new TeamService(db);
        await service.CreateAsync(new CreateTeamRequest { Name = "Alpha" });
        var zulu = await service.CreateAsync(new CreateTeamRequest { Name = "Zulu" });

        var renamed = await service.UpdateAsync(zulu.Team!.Id, new CreateTeamRequest { Name = "Alpha" });

        Assert.Equal(TeamSaveOutcome.DuplicateName, renamed.Outcome);
    }

    [Fact]
    public async Task Renaming_a_team_to_its_own_name_is_allowed()
    {
        using var db = NewDb();
        var service = new TeamService(db);
        var alpha = await service.CreateAsync(new CreateTeamRequest { Name = "Alpha" });

        var renamed = await service.UpdateAsync(alpha.Team!.Id, new CreateTeamRequest { Name = "Alpha" });

        Assert.Equal(TeamSaveOutcome.Success, renamed.Outcome);
    }

    [Fact]
    public async Task A_team_lists_its_squads()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        db.Add(team);
        db.AddRange(
            new Squad { Id = Guid.NewGuid(), Name = "Squad Two", TeamId = team.Id },
            new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = team.Id },
            new Squad { Id = Guid.NewGuid(), Name = "Unrelated", TeamId = null });
        await db.SaveChangesAsync();

        var dto = await new TeamService(db).GetByIdAsync(team.Id);

        Assert.Equal(["Squad One", "Squad Two"], dto!.Squads.Select(s => s.Name));
    }
}
