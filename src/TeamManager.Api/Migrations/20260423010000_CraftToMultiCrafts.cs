using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class CraftToMultiCrafts : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Crafts",
                table: "TeamMembers",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            // Migrate existing single-craft values to JSON array
            migrationBuilder.Sql(@"UPDATE ""TeamMembers"" SET ""Crafts"" = CASE WHEN ""Craft"" IS NULL THEN '[]' ELSE '[""' || ""Craft"" || '""]' END");

            migrationBuilder.DropColumn(
                name: "Craft",
                table: "TeamMembers");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Craft",
                table: "TeamMembers",
                type: "text",
                nullable: true);

            migrationBuilder.Sql(@"UPDATE ""TeamMembers"" SET ""Craft"" = CASE WHEN ""Crafts"" = '[]' THEN NULL ELSE trim(both '""' from split_part(""Crafts"", '"",""', 1)) END");

            migrationBuilder.DropColumn(
                name: "Crafts",
                table: "TeamMembers");
        }
    }
}
