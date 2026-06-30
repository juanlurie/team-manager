using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomFieldValuesJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomFieldValuesJson",
                table: "TimesheetSystemConfigs",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CustomFieldValuesJson",
                table: "MemberTimesheetConfigs",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomFieldValuesJson",
                table: "TimesheetSystemConfigs");

            migrationBuilder.DropColumn(
                name: "CustomFieldValuesJson",
                table: "MemberTimesheetConfigs");
        }
    }
}
