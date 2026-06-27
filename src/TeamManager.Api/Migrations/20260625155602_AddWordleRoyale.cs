using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWordleRoyale : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WordleRoyaleMatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Player1Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Player2Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WinnerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Player1Guesses = table.Column<int>(type: "integer", nullable: false),
                    Player2Guesses = table.Column<int>(type: "integer", nullable: false),
                    Player1Won = table.Column<bool>(type: "boolean", nullable: false),
                    Player2Won = table.Column<bool>(type: "boolean", nullable: false),
                    Player1EloChange = table.Column<int>(type: "integer", nullable: false),
                    Player2EloChange = table.Column<int>(type: "integer", nullable: false),
                    Player1EloAfter = table.Column<int>(type: "integer", nullable: false),
                    Player2EloAfter = table.Column<int>(type: "integer", nullable: false),
                    IsoWeek = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    PlayedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WordleRoyaleMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WordleRoyaleMatches_TeamMembers_Player1Id",
                        column: x => x.Player1Id,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WordleRoyaleMatches_TeamMembers_Player2Id",
                        column: x => x.Player2Id,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WordleRoyaleMatches_WordleSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "WordleSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WordleRoyaleRatings",
                columns: table => new
                {
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Elo = table.Column<int>(type: "integer", nullable: false),
                    WinStreak = table.Column<int>(type: "integer", nullable: false),
                    BestStreak = table.Column<int>(type: "integer", nullable: false),
                    Wins = table.Column<int>(type: "integer", nullable: false),
                    Losses = table.Column<int>(type: "integer", nullable: false),
                    Draws = table.Column<int>(type: "integer", nullable: false),
                    LastUpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WordleRoyaleRatings", x => x.MemberId);
                    table.ForeignKey(
                        name: "FK_WordleRoyaleRatings_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WordleRoyaleMatch_Player1Week",
                table: "WordleRoyaleMatches",
                columns: new[] { "Player1Id", "Year", "IsoWeek" });

            migrationBuilder.CreateIndex(
                name: "IX_WordleRoyaleMatch_Player2Week",
                table: "WordleRoyaleMatches",
                columns: new[] { "Player2Id", "Year", "IsoWeek" });

            migrationBuilder.CreateIndex(
                name: "IX_WordleRoyaleMatch_SessionId",
                table: "WordleRoyaleMatches",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_WordleRoyaleMatch_Week",
                table: "WordleRoyaleMatches",
                columns: new[] { "Year", "IsoWeek" });

            migrationBuilder.CreateIndex(
                name: "IX_WordleRoyaleRating_Elo",
                table: "WordleRoyaleRatings",
                column: "Elo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WordleRoyaleMatches");

            migrationBuilder.DropTable(
                name: "WordleRoyaleRatings");
        }
    }
}
