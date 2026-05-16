using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkItemEventsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkItemEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<int>(type: "integer", nullable: false),
                    FromValue = table.Column<string>(type: "text", nullable: true),
                    ToValue = table.Column<string>(type: "text", nullable: true),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkItemEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkItemEvents_WorkItems_WorkItemId",
                        column: x => x.WorkItemId,
                        principalTable: "WorkItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkItemEvents_WorkItemId",
                table: "WorkItemEvents",
                column: "WorkItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkItemEvents");
        }
    }
}
