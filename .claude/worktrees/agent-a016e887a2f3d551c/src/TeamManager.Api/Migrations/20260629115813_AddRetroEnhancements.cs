using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RetroIcebreakerAnswersJson",
                table: "Sprints",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RetroTimerJson",
                table: "Sprints",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RetroCardReactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CardId = table.Column<Guid>(type: "uuid", nullable: false),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Emoji = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroCardReactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroCardReactions_RetroCards_CardId",
                        column: x => x.CardId,
                        principalTable: "RetroCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RetroCardReaction_CardId_MemberId_Emoji",
                table: "RetroCardReactions",
                columns: new[] { "CardId", "MemberId", "Emoji" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroCardReactions_SprintId",
                table: "RetroCardReactions",
                column: "SprintId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RetroCardReactions");

            migrationBuilder.DropColumn(
                name: "RetroIcebreakerAnswersJson",
                table: "Sprints");

            migrationBuilder.DropColumn(
                name: "RetroTimerJson",
                table: "Sprints");
        }
    }
}
