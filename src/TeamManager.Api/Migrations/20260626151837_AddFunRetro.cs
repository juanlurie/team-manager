using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFunRetro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FunRetroSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "text", nullable: true),
                    Phase = table.Column<string>(type: "text", nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunRetroSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunRetroSessions_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_FunRetroSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FunRetroCards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Column = table.Column<string>(type: "text", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorName = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunRetroCards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunRetroCards_FunRetroSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "FunRetroSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FunRetroCards_TeamMembers_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FunRetroReactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CardId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Emoji = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunRetroReactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunRetroReactions_FunRetroCards_CardId",
                        column: x => x.CardId,
                        principalTable: "FunRetroCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FunRetroVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CardId = table.Column<Guid>(type: "uuid", nullable: false),
                    VoterId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunRetroVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunRetroVotes_FunRetroCards_CardId",
                        column: x => x.CardId,
                        principalTable: "FunRetroCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroCard_SessionId",
                table: "FunRetroCards",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroCards_AuthorId",
                table: "FunRetroCards",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroReaction_CardId_MemberId_Emoji",
                table: "FunRetroReactions",
                columns: new[] { "CardId", "MemberId", "Emoji" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroSession_CreatedByMemberId",
                table: "FunRetroSessions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroSessions_SprintId",
                table: "FunRetroSessions",
                column: "SprintId");

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroVote_CardId_VoterId",
                table: "FunRetroVotes",
                columns: new[] { "CardId", "VoterId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "FunRetroReactions");
            migrationBuilder.DropTable(name: "FunRetroVotes");
            migrationBuilder.DropTable(name: "FunRetroCards");
            migrationBuilder.DropTable(name: "FunRetroSessions");
        }
    }
}
