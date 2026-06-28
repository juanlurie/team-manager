using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUltimateTttGame : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameUltimateTttSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CellsJson = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BigBoardJson = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CurrentTurnMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    NextBoardIndex = table.Column<int>(type: "integer", nullable: false),
                    WinnerMemberId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameUltimateTttSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameUltimateTttSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GameUltimateTttParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    IsWinner = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameUltimateTttParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameUltimateTttParticipants_GameUltimateTttSessions_Session~",
                        column: x => x.SessionId,
                        principalTable: "GameUltimateTttSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GameUltimateTttParticipants_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameUltimateTttParticipants_MemberId",
                table: "GameUltimateTttParticipants",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_GameUltimateTttParticipants_SessionId",
                table: "GameUltimateTttParticipants",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_GameUltimateTttSessions_CreatedByMemberId",
                table: "GameUltimateTttSessions",
                column: "CreatedByMemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameUltimateTttParticipants");

            migrationBuilder.DropTable(
                name: "GameUltimateTttSessions");
        }
    }
}
