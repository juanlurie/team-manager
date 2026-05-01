using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

public partial class AddSquads : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Squads",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Squads", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "SquadMembers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                SquadId = table.Column<Guid>(type: "uuid", nullable: false),
                TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SquadMembers", x => x.Id);
                table.ForeignKey(
                    name: "FK_SquadMembers_Squads_SquadId",
                    column: x => x.SquadId,
                    principalTable: "Squads",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_SquadMembers_TeamMembers_TeamMemberId",
                    column: x => x.TeamMemberId,
                    principalTable: "TeamMembers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_SquadMembers_SquadId_TeamMemberId",
            table: "SquadMembers",
            columns: new[] { "SquadId", "TeamMemberId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_SquadMembers_TeamMemberId",
            table: "SquadMembers",
            column: "TeamMemberId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SquadMembers");
        migrationBuilder.DropTable(name: "Squads");
    }
}
