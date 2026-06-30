using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizDuelTiebreaker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "QuizCorrectIndex",
                table: "WinWeeks",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "QuizEndsAt",
                table: "WinWeeks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuizOptionsJson",
                table: "WinWeeks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuizQuestion",
                table: "WinWeeks",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WinQuizAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WinWeekId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    SelectedIndex = table.Column<int>(type: "integer", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false),
                    AnsweredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinQuizAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinQuizAnswers_WinWeeks_WinWeekId",
                        column: x => x.WinWeekId,
                        principalTable: "WinWeeks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WinQuizAnswers_WinWeekId",
                table: "WinQuizAnswers",
                column: "WinWeekId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WinQuizAnswers");

            migrationBuilder.DropColumn(
                name: "QuizCorrectIndex",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "QuizEndsAt",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "QuizOptionsJson",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "QuizQuestion",
                table: "WinWeeks");
        }
    }
}
