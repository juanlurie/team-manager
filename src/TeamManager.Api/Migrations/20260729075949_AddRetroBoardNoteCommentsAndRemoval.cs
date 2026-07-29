using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoardNoteCommentsAndRemoval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RemovedAt",
                table: "RetroBoardParticipants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RetroBoardNoteComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    AuthorGuestSessionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    AuthorDisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardNoteComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardNoteComments_RetroBoardNotes_RetroBoardNoteId",
                        column: x => x.RetroBoardNoteId,
                        principalTable: "RetroBoardNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetroBoardNoteComments_TeamMembers_AuthorMemberId",
                        column: x => x.AuthorMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardNoteComment_NoteId",
                table: "RetroBoardNoteComments",
                column: "RetroBoardNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardNoteComments_AuthorMemberId",
                table: "RetroBoardNoteComments",
                column: "AuthorMemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RetroBoardNoteComments");

            migrationBuilder.DropColumn(
                name: "RemovedAt",
                table: "RetroBoardParticipants");
        }
    }
}
