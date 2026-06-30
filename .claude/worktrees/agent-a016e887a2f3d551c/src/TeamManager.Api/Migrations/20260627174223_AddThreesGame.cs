using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddThreesGame : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameThreesSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameThreesSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameThreesSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GameThreesParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    BoardJson = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    NextTile = table.Column<int>(type: "integer", nullable: false),
                    IsGameOver = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameThreesParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameThreesParticipants_GameThreesSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "GameThreesSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GameThreesParticipants_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameThreesParticipants_MemberId",
                table: "GameThreesParticipants",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_GameThreesParticipants_SessionId",
                table: "GameThreesParticipants",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_GameThreesSessions_CreatedByMemberId",
                table: "GameThreesSessions",
                column: "CreatedByMemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameThreesParticipants");

            migrationBuilder.DropTable(
                name: "GameThreesSessions");
        }
    }
}
