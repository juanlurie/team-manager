using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConnectCatalogToMeetings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SessionDefinitionId",
                table: "MeetingSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SessionDefinitionSlotId",
                table: "MeetingSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSessions_SessionDefinitionId",
                table: "MeetingSessions",
                column: "SessionDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSessions_SessionDefinitionSlotId",
                table: "MeetingSessions",
                column: "SessionDefinitionSlotId",
                unique: true,
                filter: "\"SessionDefinitionSlotId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_MeetingSessions_SessionDefinitionSlots_SessionDefinitionSlo~",
                table: "MeetingSessions",
                column: "SessionDefinitionSlotId",
                principalTable: "SessionDefinitionSlots",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_MeetingSessions_SessionDefinitions_SessionDefinitionId",
                table: "MeetingSessions",
                column: "SessionDefinitionId",
                principalTable: "SessionDefinitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MeetingSessions_SessionDefinitionSlots_SessionDefinitionSlo~",
                table: "MeetingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_MeetingSessions_SessionDefinitions_SessionDefinitionId",
                table: "MeetingSessions");

            migrationBuilder.DropIndex(
                name: "IX_MeetingSessions_SessionDefinitionId",
                table: "MeetingSessions");

            migrationBuilder.DropIndex(
                name: "IX_MeetingSessions_SessionDefinitionSlotId",
                table: "MeetingSessions");

            migrationBuilder.DropColumn(
                name: "SessionDefinitionId",
                table: "MeetingSessions");

            migrationBuilder.DropColumn(
                name: "SessionDefinitionSlotId",
                table: "MeetingSessions");
        }
    }
}
