using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class LeaveDecoupledFromSprint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LeaveRecords_SprintMembers_SprintMemberId",
                table: "LeaveRecords");

            migrationBuilder.RenameColumn(
                name: "SprintMemberId",
                table: "LeaveRecords",
                newName: "TeamMemberId");

            migrationBuilder.RenameIndex(
                name: "IX_LeaveRecords_SprintMemberId",
                table: "LeaveRecords",
                newName: "IX_LeaveRecords_TeamMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_LeaveRecords_TeamMembers_TeamMemberId",
                table: "LeaveRecords",
                column: "TeamMemberId",
                principalTable: "TeamMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LeaveRecords_TeamMembers_TeamMemberId",
                table: "LeaveRecords");

            migrationBuilder.RenameColumn(
                name: "TeamMemberId",
                table: "LeaveRecords",
                newName: "SprintMemberId");

            migrationBuilder.RenameIndex(
                name: "IX_LeaveRecords_TeamMemberId",
                table: "LeaveRecords",
                newName: "IX_LeaveRecords_SprintMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_LeaveRecords_SprintMembers_SprintMemberId",
                table: "LeaveRecords",
                column: "SprintMemberId",
                principalTable: "SprintMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
