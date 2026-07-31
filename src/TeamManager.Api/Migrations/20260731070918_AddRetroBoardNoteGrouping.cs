using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoardNoteGrouping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GroupId",
                table: "RetroBoardNotes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GroupLabel",
                table: "RetroBoardNotes",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardNote_GroupId",
                table: "RetroBoardNotes",
                column: "GroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RetroBoardNote_GroupId",
                table: "RetroBoardNotes");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "RetroBoardNotes");

            migrationBuilder.DropColumn(
                name: "GroupLabel",
                table: "RetroBoardNotes");
        }
    }
}
