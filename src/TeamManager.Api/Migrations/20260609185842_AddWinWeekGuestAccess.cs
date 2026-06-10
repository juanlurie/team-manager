using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWinWeekGuestAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GuestToken",
                table: "WinWeeks",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "TeamMemberId",
                table: "WinNominations",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "GuestName",
                table: "WinNominations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestSessionId",
                table: "WinNominations",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_GuestToken",
                table: "WinWeeks",
                column: "GuestToken",
                unique: true,
                filter: "\"GuestToken\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WinWeeks_GuestToken",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "GuestToken",
                table: "WinWeeks");

            migrationBuilder.DropColumn(
                name: "GuestName",
                table: "WinNominations");

            migrationBuilder.DropColumn(
                name: "GuestSessionId",
                table: "WinNominations");

            migrationBuilder.AlterColumn<Guid>(
                name: "TeamMemberId",
                table: "WinNominations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
