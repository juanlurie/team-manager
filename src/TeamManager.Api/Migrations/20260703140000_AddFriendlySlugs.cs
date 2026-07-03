using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFriendlySlugs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "FunRetroSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Polls",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroSession_Slug",
                table: "FunRetroSessions",
                column: "Slug",
                unique: true,
                filter: "\"Slug\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Poll_Slug",
                table: "Polls",
                column: "Slug",
                unique: true,
                filter: "\"Slug\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FunRetroSession_Slug",
                table: "FunRetroSessions");

            migrationBuilder.DropIndex(
                name: "IX_Poll_Slug",
                table: "Polls");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "FunRetroSessions");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Polls");
        }
    }
}
