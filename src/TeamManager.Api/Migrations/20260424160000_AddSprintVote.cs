using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations;

public partial class AddSprintVote : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "SprintVotes",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                VoterSprintMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                NomineeSprintMemberId = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SprintVotes", x => x.Id);
                table.ForeignKey(
                    name: "FK_SprintVotes_Sprints_SprintId",
                    column: x => x.SprintId,
                    principalTable: "Sprints",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_SprintVotes_SprintMembers_VoterSprintMemberId",
                    column: x => x.VoterSprintMemberId,
                    principalTable: "SprintMembers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_SprintVotes_SprintMembers_NomineeSprintMemberId",
                    column: x => x.NomineeSprintMemberId,
                    principalTable: "SprintMembers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_SprintVotes_SprintId_VoterSprintMemberId",
            table: "SprintVotes",
            columns: new[] { "SprintId", "VoterSprintMemberId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_SprintVotes_NomineeSprintMemberId",
            table: "SprintVotes",
            column: "NomineeSprintMemberId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SprintVotes");
    }
}
