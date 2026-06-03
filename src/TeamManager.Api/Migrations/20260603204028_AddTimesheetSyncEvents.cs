using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTimesheetSyncEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TimesheetSyncEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TimesheetEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    EntrySnapshot = table.Column<string>(type: "text", nullable: false),
                    ResolvedUrl = table.Column<string>(type: "text", nullable: false),
                    ResolvedHeadersJson = table.Column<string>(type: "text", nullable: false),
                    ResolvedBody = table.Column<string>(type: "text", nullable: false),
                    BodyFormat = table.Column<string>(type: "text", nullable: false),
                    ConfigName = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ExternalId = table.Column<string>(type: "text", nullable: true),
                    ResponseBody = table.Column<string>(type: "text", nullable: true),
                    ResponseStatus = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimesheetSyncEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimesheetSyncEvents_TimesheetEntries_TimesheetEntryId",
                        column: x => x.TimesheetEntryId,
                        principalTable: "TimesheetEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimesheetSyncEvents_TimesheetEntryId",
                table: "TimesheetSyncEvents",
                column: "TimesheetEntryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TimesheetSyncEvents");
        }
    }
}
