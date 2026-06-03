using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

[Microsoft.EntityFrameworkCore.Migrations.Migration("20260529000000_AddSuddenDeathEndsAt")]
public partial class AddSuddenDeathEndsAt : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "SuddenDeathEndsAt",
            table: "WinWeeks",
            type: "timestamp with time zone",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "SuddenDeathEndsAt",
            table: "WinWeeks");
    }
}
