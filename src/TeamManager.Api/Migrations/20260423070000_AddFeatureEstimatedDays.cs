using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddFeatureEstimatedDays : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedDays",
                table: "Features",
                type: "decimal(6,1)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsUnplanned",
                table: "Features",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "EstimatedDays", table: "Features");
            migrationBuilder.DropColumn(name: "IsUnplanned", table: "Features");
        }
    }
}
