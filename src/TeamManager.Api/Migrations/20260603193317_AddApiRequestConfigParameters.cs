using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddApiRequestConfigParameters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ParametersJson",
                table: "ApiRequestConfigs",
                type: "text",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.Sql("UPDATE \"ApiRequestConfigs\" SET \"ParametersJson\" = '{}' WHERE \"ParametersJson\" = '' OR \"ParametersJson\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ParametersJson",
                table: "ApiRequestConfigs");
        }
    }
}
