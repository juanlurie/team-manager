using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingSeriesSlotClaim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MeetingSeriesSlotClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingSeriesSlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingSeriesItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClaimedByMemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesSlotClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_MeetingSeriesItems_MeetingSeriesIte~",
                        column: x => x.MeetingSeriesItemId,
                        principalTable: "MeetingSeriesItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_MeetingSeriesSlots_MeetingSeriesSlo~",
                        column: x => x.MeetingSeriesSlotId,
                        principalTable: "MeetingSeriesSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_MeetingSeries_MeetingSeriesId",
                        column: x => x.MeetingSeriesId,
                        principalTable: "MeetingSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_TeamMembers_ClaimedByMemberId",
                        column: x => x.ClaimedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlotClaims_ClaimedByMemberId",
                table: "MeetingSeriesSlotClaims",
                column: "ClaimedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlotClaims_MeetingSeriesItemId",
                table: "MeetingSeriesSlotClaims",
                column: "MeetingSeriesItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlotClaims_MeetingSeriesSlotId",
                table: "MeetingSeriesSlotClaims",
                column: "MeetingSeriesSlotId");

            migrationBuilder.CreateIndex(
                name: "UQ_SlotClaim_Series_Slot",
                table: "MeetingSeriesSlotClaims",
                columns: new[] { "MeetingSeriesId", "MeetingSeriesSlotId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeetingSeriesSlotClaims");
        }
    }
}
