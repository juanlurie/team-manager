using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizDuelAutoLoop : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "QuizRevealedAt",
                table: "WinWeeks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "QuizWinnerMemberId",
                table: "WinWeeks",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuizRevealedAt",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "QuizWinnerMemberId",
                table: "WinWeeks");
        }
    }
}
