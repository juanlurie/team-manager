using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarDefaultsToTimesheetConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CalendarDefaultCategory",
                table: "MemberTimesheetConfigs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CalendarDefaultProject",
                table: "MemberTimesheetConfigs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CalendarDefaultCategory",
                table: "MemberTimesheetConfigs");

            migrationBuilder.DropColumn(
                name: "CalendarDefaultProject",
                table: "MemberTimesheetConfigs");
        }
    }
}
