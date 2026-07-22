using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoardGuestFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RetroBoardFeedbackResponse_PromptId_MemberId",
                table: "RetroBoardFeedbackResponses");

            migrationBuilder.AlterColumn<Guid>(
                name: "MemberId",
                table: "RetroBoardFeedbackResponses",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "GuestSessionId",
                table: "RetroBoardFeedbackResponses",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardFeedbackResponse_PromptId_GuestSessionId",
                table: "RetroBoardFeedbackResponses",
                columns: new[] { "RetroBoardFeedbackPromptId", "GuestSessionId" },
                unique: true,
                filter: "\"GuestSessionId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardFeedbackResponse_PromptId_MemberId",
                table: "RetroBoardFeedbackResponses",
                columns: new[] { "RetroBoardFeedbackPromptId", "MemberId" },
                unique: true,
                filter: "\"MemberId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RetroBoardFeedbackResponse_PromptId_GuestSessionId",
                table: "RetroBoardFeedbackResponses");

            migrationBuilder.DropIndex(
                name: "IX_RetroBoardFeedbackResponse_PromptId_MemberId",
                table: "RetroBoardFeedbackResponses");

            migrationBuilder.DropColumn(
                name: "GuestSessionId",
                table: "RetroBoardFeedbackResponses");

            migrationBuilder.AlterColumn<Guid>(
                name: "MemberId",
                table: "RetroBoardFeedbackResponses",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardFeedbackResponse_PromptId_MemberId",
                table: "RetroBoardFeedbackResponses",
                columns: new[] { "RetroBoardFeedbackPromptId", "MemberId" },
                unique: true);
        }
    }
}
