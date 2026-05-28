using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

/// <inheritdoc />
public partial class AddScrumPokerTables : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ScrumPokerSessions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                StoryTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                Scale = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                Revealed = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                RevealedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                ResetAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ScrumPokerSessions", x => x.Id);
                table.ForeignKey(
                    name: "FK_ScrumPokerSessions_TeamMembers_CreatedByMemberId",
                    column: x => x.CreatedByMemberId,
                    principalTable: "TeamMembers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "ScrumPokerVotes",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                Value = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                VotedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ScrumPokerVotes", x => x.Id);
                table.ForeignKey(
                    name: "FK_ScrumPokerVotes_ScrumPokerSessions_SessionId",
                    column: x => x.SessionId,
                    principalTable: "ScrumPokerSessions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_ScrumPokerVotes_TeamMembers_MemberId",
                    column: x => x.MemberId,
                    principalTable: "TeamMembers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_ScrumPokerSession_CreatedAt",
            table: "ScrumPokerSessions",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_ScrumPokerSession_CreatedByMemberId",
            table: "ScrumPokerSessions",
            column: "CreatedByMemberId");

        migrationBuilder.CreateIndex(
            name: "IX_ScrumPokerVote_MemberId",
            table: "ScrumPokerVotes",
            column: "MemberId");

        migrationBuilder.CreateIndex(
            name: "IX_ScrumPokerVote_SessionId",
            table: "ScrumPokerVotes",
            column: "SessionId");

        migrationBuilder.CreateIndex(
            name: "IX_ScrumPokerVote_SessionId_MemberId",
            table: "ScrumPokerVotes",
            columns: new[] { "SessionId", "MemberId" },
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ScrumPokerVotes");
        migrationBuilder.DropTable(name: "ScrumPokerSessions");
    }
}
