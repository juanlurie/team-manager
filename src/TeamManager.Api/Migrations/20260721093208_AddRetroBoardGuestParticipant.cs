using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoardGuestParticipant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RetroBoardParticipant_SessionId_MemberId",
                table: "RetroBoardParticipants");

            migrationBuilder.AddColumn<bool>(
                name: "AllowGuestJoin",
                table: "RetroBoardSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "MemberId",
                table: "RetroBoardParticipants",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "RetroBoardParticipants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestSessionId",
                table: "RetroBoardParticipants",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardParticipant_SessionId_GuestSessionId",
                table: "RetroBoardParticipants",
                columns: new[] { "RetroBoardSessionId", "GuestSessionId" },
                unique: true,
                filter: "\"GuestSessionId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardParticipant_SessionId_MemberId",
                table: "RetroBoardParticipants",
                columns: new[] { "RetroBoardSessionId", "MemberId" },
                unique: true,
                filter: "\"MemberId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RetroBoardParticipant_SessionId_GuestSessionId",
                table: "RetroBoardParticipants");

            migrationBuilder.DropIndex(
                name: "IX_RetroBoardParticipant_SessionId_MemberId",
                table: "RetroBoardParticipants");

            migrationBuilder.DropColumn(
                name: "AllowGuestJoin",
                table: "RetroBoardSessions");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "RetroBoardParticipants");

            migrationBuilder.DropColumn(
                name: "GuestSessionId",
                table: "RetroBoardParticipants");

            migrationBuilder.AlterColumn<Guid>(
                name: "MemberId",
                table: "RetroBoardParticipants",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardParticipant_SessionId_MemberId",
                table: "RetroBoardParticipants",
                columns: new[] { "RetroBoardSessionId", "MemberId" },
                unique: true);
        }
    }
}
