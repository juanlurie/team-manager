using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoardFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RetroBoardFeedbackPrompts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardFeedbackPrompts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardFeedbackPrompts_RetroBoardSessions_RetroBoardSess~",
                        column: x => x.RetroBoardSessionId,
                        principalTable: "RetroBoardSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardFeedbackResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardFeedbackPromptId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardFeedbackResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardFeedbackResponses_RetroBoardFeedbackPrompts_Retro~",
                        column: x => x.RetroBoardFeedbackPromptId,
                        principalTable: "RetroBoardFeedbackPrompts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetroBoardFeedbackResponses_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardFeedbackPrompt_SessionId",
                table: "RetroBoardFeedbackPrompts",
                column: "RetroBoardSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardFeedbackResponse_PromptId_MemberId",
                table: "RetroBoardFeedbackResponses",
                columns: new[] { "RetroBoardFeedbackPromptId", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardFeedbackResponses_MemberId",
                table: "RetroBoardFeedbackResponses",
                column: "MemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RetroBoardFeedbackResponses");

            migrationBuilder.DropTable(
                name: "RetroBoardFeedbackPrompts");
        }
    }
}
