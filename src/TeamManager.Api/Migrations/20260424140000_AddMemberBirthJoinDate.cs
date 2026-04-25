using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

public partial class AddMemberBirthJoinDate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateOnly>(name: "BirthDate", table: "TeamMembers", type: "date", nullable: true);
        migrationBuilder.AddColumn<DateOnly>(name: "JoinDate",  table: "TeamMembers", type: "date", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "BirthDate", table: "TeamMembers");
        migrationBuilder.DropColumn(name: "JoinDate",  table: "TeamMembers");
    }
}
