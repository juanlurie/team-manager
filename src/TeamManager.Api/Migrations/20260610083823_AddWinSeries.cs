using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWinSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WinWeeks_WeekStart",
                table: "WinWeeks");

            // 1. Create WinSeries table
            migrationBuilder.CreateTable(
                name: "WinSeries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinSeries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinSeries_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WinSeries_CreatedByMemberId",
                table: "WinSeries",
                column: "CreatedByMemberId");

            // 2. Seed the Default series and migrate existing weeks
            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    default_series_id uuid;
                    first_member_id uuid;
                BEGIN
                    SELECT ""Id"" INTO first_member_id FROM ""TeamMembers"" WHERE ""IsActive"" = true ORDER BY ""CreatedAt"" LIMIT 1;
                    IF first_member_id IS NULL THEN
                        SELECT ""Id"" INTO first_member_id FROM ""TeamMembers"" ORDER BY ""CreatedAt"" LIMIT 1;
                    END IF;
                    default_series_id := gen_random_uuid();
                    INSERT INTO ""WinSeries"" (""Id"", ""Name"", ""CreatedByMemberId"", ""CreatedAt"")
                    VALUES (default_series_id, 'Default', first_member_id, NOW());
                    -- Add WinSeriesId column as nullable temporarily to seed data
                    ALTER TABLE ""WinWeeks"" ADD COLUMN ""WinSeriesId"" uuid;
                    UPDATE ""WinWeeks"" SET ""WinSeriesId"" = default_series_id;
                    ALTER TABLE ""WinWeeks"" ALTER COLUMN ""WinSeriesId"" SET NOT NULL;
                END $$;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_WinSeriesId_WeekStart",
                table: "WinWeeks",
                columns: new[] { "WinSeriesId", "WeekStart" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_WinWeeks_WinSeries_WinSeriesId",
                table: "WinWeeks",
                column: "WinSeriesId",
                principalTable: "WinSeries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WinWeeks_WinSeries_WinSeriesId",
                table: "WinWeeks");

            migrationBuilder.DropTable(
                name: "WinSeries");

            migrationBuilder.DropIndex(
                name: "IX_WinWeeks_WinSeriesId_WeekStart",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "WinSeriesId",
                table: "WinWeeks");

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_WeekStart",
                table: "WinWeeks",
                column: "WeekStart",
                unique: true);
        }
    }
}
