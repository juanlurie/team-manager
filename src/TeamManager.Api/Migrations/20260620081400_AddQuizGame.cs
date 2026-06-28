using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizGame : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "QuizGameSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    QuestionCount = table.Column<int>(type: "integer", nullable: false),
                    CurrentQuestionIndex = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CurrentQuestion = table.Column<string>(type: "text", nullable: true),
                    CurrentOptionsJson = table.Column<string>(type: "text", nullable: true),
                    CurrentCorrectIndex = table.Column<int>(type: "integer", nullable: true),
                    CurrentQuestionEndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CurrentQuestionRevealed = table.Column<bool>(type: "boolean", nullable: false),
                    CurrentQuestionRevealedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizGameSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizGameSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuizGameAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionIndex = table.Column<int>(type: "integer", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    SelectedIndex = table.Column<int>(type: "integer", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false),
                    AnsweredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizGameAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizGameAnswers_QuizGameSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "QuizGameSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuizGameParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizGameParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizGameParticipants_QuizGameSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "QuizGameSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QuizGameParticipants_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuizGameAnswer_SessionId_QuestionIndex_MemberId",
                table: "QuizGameAnswers",
                columns: new[] { "SessionId", "QuestionIndex", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizGameParticipant_SessionId_MemberId",
                table: "QuizGameParticipants",
                columns: new[] { "SessionId", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizGameParticipants_MemberId",
                table: "QuizGameParticipants",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizGameSession_CreatedByMemberId",
                table: "QuizGameSessions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizGameSession_Status",
                table: "QuizGameSessions",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuizGameAnswers");

            migrationBuilder.DropTable(
                name: "QuizGameParticipants");

            migrationBuilder.DropTable(
                name: "QuizGameSessions");
        }
    }
}
