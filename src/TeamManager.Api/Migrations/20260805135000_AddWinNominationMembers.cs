using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TeamManager.Api.Infrastructure.Data;

#nullable disable

namespace TeamManager.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260805135000_AddWinNominationMembers")]
public partial class AddWinNominationMembers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "WinNominationMembers",
            columns: table => new
            {
                WinNominationId = table.Column<Guid>(type: "uuid", nullable: false),
                TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_WinNominationMembers", x => new { x.WinNominationId, x.TeamMemberId });
                table.ForeignKey("FK_WinNominationMembers_TeamMembers_TeamMemberId", x => x.TeamMemberId, "TeamMembers", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_WinNominationMembers_WinNominations_WinNominationId", x => x.WinNominationId, "WinNominations", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_WinNominationMembers_TeamMemberId",
            table: "WinNominationMembers",
            column: "TeamMemberId");

        migrationBuilder.Sql("""
            INSERT INTO "WinNominationMembers" ("WinNominationId", "TeamMemberId")
            SELECT "Id", "NomineeMemberId" FROM "WinNominations";
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable(name: "WinNominationMembers");
}
