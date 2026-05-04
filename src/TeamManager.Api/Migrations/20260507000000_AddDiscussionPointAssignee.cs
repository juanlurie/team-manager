using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscussionPointAssignee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TeamMemberId",
                table: "DiscussionPoints",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DiscussionPoints_TeamMemberId",
                table: "DiscussionPoints",
                column: "TeamMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_DiscussionPoints_TeamMembers_TeamMemberId",
                table: "DiscussionPoints",
                column: "TeamMemberId",
                principalTable: "TeamMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DiscussionPoints_TeamMembers_TeamMemberId",
                table: "DiscussionPoints");

            migrationBuilder.DropIndex(
                name: "IX_DiscussionPoints_TeamMemberId",
                table: "DiscussionPoints");

            migrationBuilder.DropColumn(
                name: "TeamMemberId",
                table: "DiscussionPoints");
        }
    }
}
