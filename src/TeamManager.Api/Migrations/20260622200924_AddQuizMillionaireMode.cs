using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizMillionaireMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GameMode",
                table: "QuizGameSessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "MillionaireLifelinesUsedJson",
                table: "QuizGameParticipants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "MillionaireRoundEndsAt",
                table: "QuizGameParticipants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MillionaireRoundIndex",
                table: "QuizGameParticipants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MillionaireStatus",
                table: "QuizGameParticipants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<long>(
                name: "MillionaireWinnings",
                table: "QuizGameParticipants",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.CreateTable(
                name: "QuizMillionaireRounds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoundIndex = table.Column<int>(type: "integer", nullable: false),
                    Question = table.Column<string>(type: "text", nullable: false),
                    OptionsJson = table.Column<string>(type: "text", nullable: false),
                    CorrectIndex = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizMillionaireRounds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizMillionaireRounds_QuizGameSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "QuizGameSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuizMillionaireRound_SessionId_RoundIndex",
                table: "QuizMillionaireRounds",
                columns: new[] { "SessionId", "RoundIndex" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuizMillionaireRounds");

            migrationBuilder.DropColumn(
                name: "GameMode",
                table: "QuizGameSessions");

            migrationBuilder.DropColumn(
                name: "MillionaireLifelinesUsedJson",
                table: "QuizGameParticipants");

            migrationBuilder.DropColumn(
                name: "MillionaireRoundEndsAt",
                table: "QuizGameParticipants");

            migrationBuilder.DropColumn(
                name: "MillionaireRoundIndex",
                table: "QuizGameParticipants");

            migrationBuilder.DropColumn(
                name: "MillionaireStatus",
                table: "QuizGameParticipants");

            migrationBuilder.DropColumn(
                name: "MillionaireWinnings",
                table: "QuizGameParticipants");
        }
    }
}
