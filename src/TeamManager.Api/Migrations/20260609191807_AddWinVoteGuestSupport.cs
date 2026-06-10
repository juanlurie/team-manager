using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWinVoteGuestSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WinVotes_WinNominationId_TeamMemberId",
                table: "WinVotes");

            migrationBuilder.AlterColumn<Guid>(
                name: "TeamMemberId",
                table: "WinVotes",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "GuestSessionId",
                table: "WinVotes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_WinNominationId_GuestSessionId",
                table: "WinVotes",
                columns: new[] { "WinNominationId", "GuestSessionId" },
                unique: true,
                filter: "\"GuestSessionId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_WinNominationId_TeamMemberId",
                table: "WinVotes",
                columns: new[] { "WinNominationId", "TeamMemberId" },
                unique: true,
                filter: "\"TeamMemberId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WinVotes_WinNominationId_GuestSessionId",
                table: "WinVotes");

            migrationBuilder.DropIndex(
                name: "IX_WinVotes_WinNominationId_TeamMemberId",
                table: "WinVotes");

            migrationBuilder.DropColumn(
                name: "GuestSessionId",
                table: "WinVotes");

            migrationBuilder.AlterColumn<Guid>(
                name: "TeamMemberId",
                table: "WinVotes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_WinNominationId_TeamMemberId",
                table: "WinVotes",
                columns: new[] { "WinNominationId", "TeamMemberId" },
                unique: true);
        }
    }
}
