using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

public partial class AddSprintRetro : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "RetroWentWell",    table: "Sprints", type: "text", nullable: true);
        migrationBuilder.AddColumn<string>(name: "RetroDidntGoWell", table: "Sprints", type: "text", nullable: true);
        migrationBuilder.AddColumn<string>(name: "RetroActionItems", table: "Sprints", type: "text", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "RetroWentWell",    table: "Sprints");
        migrationBuilder.DropColumn(name: "RetroDidntGoWell", table: "Sprints");
        migrationBuilder.DropColumn(name: "RetroActionItems", table: "Sprints");
    }
}
