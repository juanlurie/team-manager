using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberTimesheetConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MemberTimesheetConfigs",
                columns: table => new
                {
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExtraProjectsJson = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    ExtraCategoriesJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    QuickActionsJson = table.Column<string>(type: "text", nullable: false, defaultValue: "[]")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberTimesheetConfigs", x => x.TeamMemberId);
                    table.ForeignKey(
                        name: "FK_MemberTimesheetConfigs_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "MemberTimesheetConfigs");
        }
    }
}
