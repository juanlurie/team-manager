using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIsAiGeneratedFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAiGenerated",
                table: "WordleSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "QuizIsAiGenerated",
                table: "WinWeeks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsAiGenerated",
                table: "QuizMillionaireRounds",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CurrentQuestionIsAiGenerated",
                table: "QuizGameSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAiGenerated",
                table: "WordleSessions");

            migrationBuilder.DropColumn(
                name: "QuizIsAiGenerated",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "IsAiGenerated",
                table: "QuizMillionaireRounds");

            migrationBuilder.DropColumn(
                name: "CurrentQuestionIsAiGenerated",
                table: "QuizGameSessions");
        }
    }
}
