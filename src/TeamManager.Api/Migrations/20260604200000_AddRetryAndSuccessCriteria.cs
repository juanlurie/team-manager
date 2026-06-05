using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddRetryAndSuccessCriteria : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RetryCount",
                table: "ApiRequestConfigs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SuccessCriteriaJson",
                table: "ApiRequestConfigs",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "RetryCount", table: "ApiRequestConfigs");
            migrationBuilder.DropColumn(name: "SuccessCriteriaJson", table: "ApiRequestConfigs");
        }
    }
}
