using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPollRetroSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RetroSessionId",
                table: "Polls",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Polls_RetroSessionId",
                table: "Polls",
                column: "RetroSessionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Polls_FunRetroSessions_RetroSessionId",
                table: "Polls",
                column: "RetroSessionId",
                principalTable: "FunRetroSessions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Polls_FunRetroSessions_RetroSessionId",
                table: "Polls");

            migrationBuilder.DropIndex(
                name: "IX_Polls_RetroSessionId",
                table: "Polls");

            migrationBuilder.DropColumn(
                name: "RetroSessionId",
                table: "Polls");
        }
    }
}
