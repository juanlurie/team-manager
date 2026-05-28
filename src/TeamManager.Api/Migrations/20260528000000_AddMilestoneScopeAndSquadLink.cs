using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

public partial class AddMilestoneScopeAndSquadLink : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Scope",
            table: "Milestones",
            type: "text",
            nullable: false,
            defaultValue: "Global");

        migrationBuilder.AddColumn<Guid>(
            name: "SquadId",
            table: "Milestones",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Milestones_SquadId",
            table: "Milestones",
            column: "SquadId");

        migrationBuilder.AddForeignKey(
            name: "FK_Milestones_Squads_SquadId",
            table: "Milestones",
            column: "SquadId",
            principalTable: "Squads",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Milestones_Squads_SquadId",
            table: "Milestones");

        migrationBuilder.DropIndex(
            name: "IX_Milestones_SquadId",
            table: "Milestones");

        migrationBuilder.DropColumn(
            name: "Scope",
            table: "Milestones");

        migrationBuilder.DropColumn(
            name: "SquadId",
            table: "Milestones");
    }
}
