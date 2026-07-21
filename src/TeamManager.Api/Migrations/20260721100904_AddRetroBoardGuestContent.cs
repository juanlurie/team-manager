using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoardGuestContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "MemberId",
                table: "RetroBoardVotes",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "GuestSessionId",
                table: "RetroBoardVotes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AuthorGuestSessionId",
                table: "RetroBoardNotes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardVote_NoteId_GuestSessionId",
                table: "RetroBoardVotes",
                columns: new[] { "RetroBoardNoteId", "GuestSessionId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RetroBoardVote_NoteId_GuestSessionId",
                table: "RetroBoardVotes");

            migrationBuilder.DropColumn(
                name: "GuestSessionId",
                table: "RetroBoardVotes");

            migrationBuilder.DropColumn(
                name: "AuthorGuestSessionId",
                table: "RetroBoardNotes");

            migrationBuilder.AlterColumn<Guid>(
                name: "MemberId",
                table: "RetroBoardVotes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
