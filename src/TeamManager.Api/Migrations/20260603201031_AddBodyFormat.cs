using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBodyFormat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BodyFormat",
                table: "ApiRequestConfigs",
                type: "text",
                nullable: false,
                defaultValue: "urlencoded");

            migrationBuilder.Sql("UPDATE \"ApiRequestConfigs\" SET \"BodyFormat\" = 'urlencoded' WHERE \"BodyFormat\" = '' OR \"BodyFormat\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BodyFormat",
                table: "ApiRequestConfigs");
        }
    }
}
