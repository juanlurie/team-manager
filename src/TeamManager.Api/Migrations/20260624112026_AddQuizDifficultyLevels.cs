using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizDifficultyLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "QuizDifficultyLevel",
                table: "WinWeeks",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DifficultyLevel",
                table: "QuizGameSessions",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuizDifficultyLevel",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "DifficultyLevel",
                table: "QuizGameSessions");
        }
    }
}
