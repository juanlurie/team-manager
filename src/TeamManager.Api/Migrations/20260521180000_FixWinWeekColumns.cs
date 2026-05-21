using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class FixWinWeekColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "WeekEnd",
                table: "WinWeeks",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(2026, 1, 1));
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeekEnd",
                table: "WinWeeks");
        }
    }
}
