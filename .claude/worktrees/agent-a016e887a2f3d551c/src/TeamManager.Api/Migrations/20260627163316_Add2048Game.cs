using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class Add2048Game : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Game2048Sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Game2048Sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Game2048Sessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Game2048Participants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    BoardJson = table.Column<string>(type: "text", nullable: false),
                    IsGameOver = table.Column<bool>(type: "boolean", nullable: false),
                    HasWon = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Game2048Participants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Game2048Participants_Game2048Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Game2048Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Game2048Participants_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Game2048Participants_MemberId",
                table: "Game2048Participants",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Game2048Participants_SessionId",
                table: "Game2048Participants",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Game2048Sessions_CreatedByMemberId",
                table: "Game2048Sessions",
                column: "CreatedByMemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Game2048Participants");

            migrationBuilder.DropTable(
                name: "Game2048Sessions");
        }
    }
}
