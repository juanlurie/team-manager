using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MeetingSeriesItemId",
                table: "MeetingSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MeetingSeriesSlotId",
                table: "MeetingSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MeetingSeries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeries_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesSlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    LocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlots_MeetingSeries_MeetingSeriesId",
                        column: x => x.MeetingSeriesId,
                        principalTable: "MeetingSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlots_SlotLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "SlotLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    ConfirmedSlotId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItems_MeetingSeriesSlots_ConfirmedSlotId",
                        column: x => x.ConfirmedSlotId,
                        principalTable: "MeetingSeriesSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItems_MeetingSeries_MeetingSeriesId",
                        column: x => x.MeetingSeriesId,
                        principalTable: "MeetingSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesItemAvailabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingSeriesSlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesItemAvailabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemAvailabilities_MeetingSeriesItems_MeetingS~",
                        column: x => x.MeetingSeriesItemId,
                        principalTable: "MeetingSeriesItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemAvailabilities_MeetingSeriesSlots_MeetingS~",
                        column: x => x.MeetingSeriesSlotId,
                        principalTable: "MeetingSeriesSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemAvailabilities_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesItemParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesItemParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemParticipants_MeetingSeriesItems_MeetingSer~",
                        column: x => x.MeetingSeriesItemId,
                        principalTable: "MeetingSeriesItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemParticipants_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSessions_MeetingSeriesItemId",
                table: "MeetingSessions",
                column: "MeetingSeriesItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSessions_MeetingSeriesSlotId",
                table: "MeetingSessions",
                column: "MeetingSeriesSlotId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeries_CreatedByMemberId",
                table: "MeetingSeries",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemAvailabilities_MeetingSeriesItemId_Meeting~",
                table: "MeetingSeriesItemAvailabilities",
                columns: new[] { "MeetingSeriesItemId", "MeetingSeriesSlotId", "TeamMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemAvailabilities_MeetingSeriesSlotId",
                table: "MeetingSeriesItemAvailabilities",
                column: "MeetingSeriesSlotId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemAvailabilities_TeamMemberId",
                table: "MeetingSeriesItemAvailabilities",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemParticipants_MeetingSeriesItemId",
                table: "MeetingSeriesItemParticipants",
                column: "MeetingSeriesItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemParticipants_TeamMemberId",
                table: "MeetingSeriesItemParticipants",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItems_ConfirmedSlotId",
                table: "MeetingSeriesItems",
                column: "ConfirmedSlotId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItems_MeetingSeriesId",
                table: "MeetingSeriesItems",
                column: "MeetingSeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlots_LocationId",
                table: "MeetingSeriesSlots",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlots_MeetingSeriesId",
                table: "MeetingSeriesSlots",
                column: "MeetingSeriesId");

            migrationBuilder.AddForeignKey(
                name: "FK_MeetingSessions_MeetingSeriesItems_MeetingSeriesItemId",
                table: "MeetingSessions",
                column: "MeetingSeriesItemId",
                principalTable: "MeetingSeriesItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_MeetingSessions_MeetingSeriesSlots_MeetingSeriesSlotId",
                table: "MeetingSessions",
                column: "MeetingSeriesSlotId",
                principalTable: "MeetingSeriesSlots",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MeetingSessions_MeetingSeriesItems_MeetingSeriesItemId",
                table: "MeetingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_MeetingSessions_MeetingSeriesSlots_MeetingSeriesSlotId",
                table: "MeetingSessions");

            migrationBuilder.DropTable(
                name: "MeetingSeriesItemAvailabilities");

            migrationBuilder.DropTable(
                name: "MeetingSeriesItemParticipants");

            migrationBuilder.DropTable(
                name: "MeetingSeriesItems");

            migrationBuilder.DropTable(
                name: "MeetingSeriesSlots");

            migrationBuilder.DropTable(
                name: "MeetingSeries");

            migrationBuilder.DropIndex(
                name: "IX_MeetingSessions_MeetingSeriesItemId",
                table: "MeetingSessions");

            migrationBuilder.DropIndex(
                name: "IX_MeetingSessions_MeetingSeriesSlotId",
                table: "MeetingSessions");

            migrationBuilder.DropColumn(
                name: "MeetingSeriesItemId",
                table: "MeetingSessions");

            migrationBuilder.DropColumn(
                name: "MeetingSeriesSlotId",
                table: "MeetingSessions");
        }
    }
}
