using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkLocationOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WorkLocationOptionsJson",
                table: "MemberTimesheetConfigs",
                type: "text",
                nullable: false,
                defaultValue: "[\"Home\",\"Other\",\"Client\",\"Entelect\"]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkLocationOptionsJson",
                table: "MemberTimesheetConfigs");
        }
    }
}
