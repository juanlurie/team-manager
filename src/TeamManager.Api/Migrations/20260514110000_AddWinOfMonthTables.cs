using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddWinOfMonthTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WinMonths",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WinnerNominationId = table.Column<Guid>(type: "uuid", nullable: true),
                    OpenedAt = table.Column<DateTimeOffset>(name: "CreatedAt", type: "timestamp with time zone", nullable: false, defaultValue: new DateTimeOffset(1, 1, 1, 0, 0, 0, TimeSpan.Zero)),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    VotingEndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinMonths", x => x.Id);
                    table.UniqueConstraint("AK_WinMonths_YearMonth", x => new { x.Year, x.Month });
                });

            migrationBuilder.CreateTable(
                name: "WinMonthNominations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WinMonthId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceWinWeekId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomineeMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    VoteCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinMonthNominations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinMonthNominations_TeamMembers_NomineeMemberId",
                        column: x => x.NomineeMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WinMonthNominations_WinMonths_WinMonthId",
                        column: x => x.WinMonthId,
                        principalTable: "WinMonths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WinMonthNominations_WinWeeks_SourceWinWeekId",
                        column: x => x.SourceWinWeekId,
                        principalTable: "WinWeeks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WinMonthVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WinMonthNominationId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    VotedAt = table.Column<DateTimeOffset>(name: "CreatedAt", type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinMonthVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinMonthVotes_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WinMonthVotes_WinMonthNominations_WinMonthNominationId",
                        column: x => x.WinMonthNominationId,
                        principalTable: "WinMonthNominations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WinMonths_Year_Month",
                table: "WinMonths",
                columns: new[] { "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthNominations_NomineeMemberId",
                table: "WinMonthNominations",
                column: "NomineeMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthNominations_SourceWinWeekId",
                table: "WinMonthNominations",
                column: "SourceWinWeekId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthNominations_WinMonthId_NomineeMemberId",
                table: "WinMonthNominations",
                columns: new[] { "WinMonthId", "NomineeMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthVotes_TeamMemberId",
                table: "WinMonthVotes",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthVotes_WinMonthNominationId_TeamMemberId",
                table: "WinMonthVotes",
                columns: new[] { "WinMonthNominationId", "TeamMemberId" },
                unique: true);

            migrationBuilder.Sql(@"
                INSERT INTO ""Achievements"" (""Id"", ""Key"", ""Name"", ""Description"", ""Icon"", ""Category"", ""Points"")
                SELECT gen_random_uuid(), 'win-of-the-week', 'Weekly Champion', 'Won Win of the Week', 'emoji_events', 'wow', 10
                WHERE NOT EXISTS (SELECT 1 FROM ""Achievements"" WHERE ""Key"" = 'win-of-the-week');

                INSERT INTO ""Achievements"" (""Id"", ""Key"", ""Name"", ""Description"", ""Icon"", ""Category"", ""Points"")
                SELECT gen_random_uuid(), 'win-of-month-champion', 'Monthly Champion', 'Won Win of the Month', 'workspace_premium', 'wow', 50
                WHERE NOT EXISTS (SELECT 1 FROM ""Achievements"" WHERE ""Key"" = 'win-of-month-champion');

                INSERT INTO ""Achievements"" (""Id"", ""Key"", ""Name"", ""Description"", ""Icon"", ""Category"", ""Points"")
                SELECT gen_random_uuid(), 'win-of-month-voter', 'Monthly Voter', 'Participated in Win of the Month voting', 'how_to_vote', 'wow', 5
                WHERE NOT EXISTS (SELECT 1 FROM ""Achievements"" WHERE ""Key"" = 'win-of-month-voter');
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WinMonthVotes");
            migrationBuilder.DropTable(name: "WinMonthNominations");
            migrationBuilder.DropTable(name: "WinMonths");

            migrationBuilder.Sql(@"
                DELETE FROM ""Achievements"" WHERE ""Key"" IN ('win-of-the-week', 'win-of-month-champion', 'win-of-month-voter');
            ");
        }
    }
}
