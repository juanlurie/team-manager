using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

public partial class AddFeaturePermissions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "FeaturePermissions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                FeatureKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_FeaturePermissions", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "MemberFeatureOverrides",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                FeatureKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_MemberFeatureOverrides", x => x.Id);
                table.ForeignKey(
                    name: "FK_MemberFeatureOverrides_TeamMembers_TeamMemberId",
                    column: x => x.TeamMemberId,
                    principalTable: "TeamMembers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_FeaturePermission_FeatureKey_Role",
            table: "FeaturePermissions",
            columns: new[] { "FeatureKey", "Role" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_MemberFeatureOverride_MemberId_FeatureKey",
            table: "MemberFeatureOverrides",
            columns: new[] { "TeamMemberId", "FeatureKey" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "MemberFeatureOverrides");
        migrationBuilder.DropTable(name: "FeaturePermissions");
    }
}
