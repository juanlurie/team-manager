using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoardVoteThemes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VoteThemesAutoFiredAt",
                table: "RetroBoardSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoteThemesError",
                table: "RetroBoardSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoteThemesJson",
                table: "RetroBoardSessions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VoteThemesAutoFiredAt",
                table: "RetroBoardSessions");

            migrationBuilder.DropColumn(
                name: "VoteThemesError",
                table: "RetroBoardSessions");

            migrationBuilder.DropColumn(
                name: "VoteThemesJson",
                table: "RetroBoardSessions");
        }
    }
}
