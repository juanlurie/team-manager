using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddWinWeekClosedAt : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "OpenedAt",
                table: "WinWeeks",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(1, 1, 1, 0, 0, 0, TimeSpan.Zero));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ClosedAt",
                table: "WinWeeks",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OpenedAt",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "ClosedAt",
                table: "WinWeeks");
        }
    }
}
