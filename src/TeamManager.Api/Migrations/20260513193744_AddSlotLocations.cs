using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSlotLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LocationId",
                table: "MeetingSlots",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SlotLocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SlotLocations", x => x.Id);
                });

            // Seed default locations
            var remoteId = Guid.NewGuid();
            var onsiteId = Guid.NewGuid();
            var hybridId = Guid.NewGuid();

            migrationBuilder.InsertData("SlotLocations", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [remoteId, "Remote", "#4caf50", true, 0]);
            migrationBuilder.InsertData("SlotLocations", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [onsiteId, "OnSite", "#42a5f5", true, 1]);
            migrationBuilder.InsertData("SlotLocations", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [hybridId, "Hybrid", "#ff9800", true, 2]);

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSlots_LocationId",
                table: "MeetingSlots",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_MeetingSlots_SlotLocations_LocationId",
                table: "MeetingSlots",
                column: "LocationId",
                principalTable: "SlotLocations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MeetingSlots_SlotLocations_LocationId",
                table: "MeetingSlots");

            migrationBuilder.DropTable(
                name: "SlotLocations");

            migrationBuilder.DropIndex(
                name: "IX_MeetingSlots_LocationId",
                table: "MeetingSlots");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "MeetingSlots");
        }
    }
}
