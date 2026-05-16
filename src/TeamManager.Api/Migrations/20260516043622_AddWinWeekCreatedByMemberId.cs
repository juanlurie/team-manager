using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWinWeekCreatedByMemberId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByMemberId",
                table: "WinWeeks",
                type: "uuid",
                nullable: false,
                defaultValue: Guid.Empty);

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_CreatedByMemberId",
                table: "WinWeeks",
                column: "CreatedByMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_WinWeeks_TeamMembers_CreatedByMemberId",
                table: "WinWeeks",
                column: "CreatedByMemberId",
                principalTable: "TeamMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WinWeeks_TeamMembers_CreatedByMemberId",
                table: "WinWeeks");

            migrationBuilder.DropIndex(
                name: "IX_WinWeeks_CreatedByMemberId",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "CreatedByMemberId",
                table: "WinWeeks");
        }
    }
}
