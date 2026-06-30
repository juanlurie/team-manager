using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFunRetroEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IcebreakerAnswersJson",
                table: "FunRetroSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TimerJson",
                table: "FunRetroSessions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IcebreakerAnswersJson",
                table: "FunRetroSessions");

            migrationBuilder.DropColumn(
                name: "TimerJson",
                table: "FunRetroSessions");
        }
    }
}
