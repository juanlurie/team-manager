using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDotsAndBoxes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DotsAndBoxesParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DotsAndBoxesParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DotsAndBoxesParticipants_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DotsAndBoxesSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    GridSize = table.Column<int>(type: "integer", nullable: false),
                    LinesJson = table.Column<string>(type: "text", nullable: false),
                    BoxesJson = table.Column<string>(type: "text", nullable: false),
                    CurrentParticipantId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DotsAndBoxesSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DotsAndBoxesSessions_DotsAndBoxesParticipants_CurrentPartic~",
                        column: x => x.CurrentParticipantId,
                        principalTable: "DotsAndBoxesParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DotsAndBoxesSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DotsAndBoxesParticipants_MemberId",
                table: "DotsAndBoxesParticipants",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_DotsAndBoxesParticipants_SessionId",
                table: "DotsAndBoxesParticipants",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_DotsAndBoxesSessions_CreatedByMemberId",
                table: "DotsAndBoxesSessions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_DotsAndBoxesSessions_CurrentParticipantId",
                table: "DotsAndBoxesSessions",
                column: "CurrentParticipantId");

            migrationBuilder.AddForeignKey(
                name: "FK_DotsAndBoxesParticipants_DotsAndBoxesSessions_SessionId",
                table: "DotsAndBoxesParticipants",
                column: "SessionId",
                principalTable: "DotsAndBoxesSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DotsAndBoxesParticipants_DotsAndBoxesSessions_SessionId",
                table: "DotsAndBoxesParticipants");

            migrationBuilder.DropTable(
                name: "DotsAndBoxesSessions");

            migrationBuilder.DropTable(
                name: "DotsAndBoxesParticipants");
        }
    }
}
