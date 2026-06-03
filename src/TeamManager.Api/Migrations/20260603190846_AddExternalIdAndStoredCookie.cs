using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalIdAndStoredCookie : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "TimesheetEntries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoredCookie",
                table: "ApiRequestConfigs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "TimesheetEntries");

            migrationBuilder.DropColumn(
                name: "StoredCookie",
                table: "ApiRequestConfigs");
        }
    }
}
