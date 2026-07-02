using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddConnectionsGame : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameConnectionsSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PuzzleIndex = table.Column<int>(type: "integer", nullable: false),
                    PuzzleJson = table.Column<string>(type: "text", nullable: false),
                    SolvedGroupsJson = table.Column<string>(type: "text", nullable: false),
                    WrongGuessesJson = table.Column<string>(type: "text", nullable: false),
                    MistakesUsed = table.Column<int>(type: "integer", nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameConnectionsSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameConnectionsSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GameConnectionsParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameConnectionsParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameConnectionsParticipants_GameConnectionsSessions_Sessi~",
                        column: x => x.SessionId,
                        principalTable: "GameConnectionsSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GameConnectionsParticipants_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameConnectionsSessions_CreatedByMemberId",
                table: "GameConnectionsSessions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_GameConnectionsParticipants_MemberId",
                table: "GameConnectionsParticipants",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_GameConnectionsParticipants_SessionId",
                table: "GameConnectionsParticipants",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameConnectionsParticipants");

            migrationBuilder.DropTable(
                name: "GameConnectionsSessions");
        }
    }
}
