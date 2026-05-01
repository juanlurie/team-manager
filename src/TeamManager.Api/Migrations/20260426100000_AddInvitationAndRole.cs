using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

public partial class AddInvitationAndRole : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ExternalSubjectId",
            table: "TeamMembers",
            type: "character varying(256)",
            maxLength: 256,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "Invitations",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                Role = table.Column<string>(type: "text", nullable: false),
                SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                ExternalSubjectId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Invitations", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Invitations_Email",
            table: "Invitations",
            column: "Email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Invitations");

        migrationBuilder.DropColumn(
            name: "ExternalSubjectId",
            table: "TeamMembers");
    }
}
