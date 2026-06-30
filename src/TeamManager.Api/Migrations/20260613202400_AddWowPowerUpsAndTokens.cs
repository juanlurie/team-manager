using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWowPowerUpsAndTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ChaosCard",
                table: "WinNominations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HypeMeterCount",
                table: "WinNominations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PowerUp",
                table: "WinNominations",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WowMemberTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    WinWeekId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SpentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SpentOnNominationId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WowMemberTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WowMemberTokens_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WowMemberTokens_WinNominations_SpentOnNominationId",
                        column: x => x.SpentOnNominationId,
                        principalTable: "WinNominations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WowMemberTokens_WinWeeks_WinWeekId",
                        column: x => x.WinWeekId,
                        principalTable: "WinWeeks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WowMemberTokens_SpentOnNominationId",
                table: "WowMemberTokens",
                column: "SpentOnNominationId");

            migrationBuilder.CreateIndex(
                name: "IX_WowMemberTokens_TeamMemberId",
                table: "WowMemberTokens",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WowMemberTokens_WinWeekId_TeamMemberId_Source",
                table: "WowMemberTokens",
                columns: new[] { "WinWeekId", "TeamMemberId", "Source" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WowMemberTokens");

            migrationBuilder.DropColumn(
                name: "ChaosCard",
                table: "WinNominations");

            migrationBuilder.DropColumn(
                name: "HypeMeterCount",
                table: "WinNominations");

            migrationBuilder.DropColumn(
                name: "PowerUp",
                table: "WinNominations");
        }
    }
}
