using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameReviewedByColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ReviewedBy",
                table: "AccessRequests",
                newName: "ReviewedByMemberId");

            migrationBuilder.RenameIndex(
                name: "IX_AccessRequests_ReviewedBy",
                table: "AccessRequests",
                newName: "IX_AccessRequests_ReviewedByMemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
