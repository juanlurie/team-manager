using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroCards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RetroPhase",
                table: "Sprints",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RetroCards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    Column = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroCards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroCards_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetroVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CardId = table.Column<Guid>(type: "uuid", nullable: false),
                    VoterId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroVotes_RetroCards_CardId",
                        column: x => x.CardId,
                        principalTable: "RetroCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RetroCards_SprintId",
                table: "RetroCards",
                column: "SprintId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroVotes_CardId",
                table: "RetroVotes",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroVotes_CardId_VoterId",
                table: "RetroVotes",
                columns: new[] { "CardId", "VoterId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "RetroVotes");
            migrationBuilder.DropTable(name: "RetroCards");
            migrationBuilder.DropColumn(name: "RetroPhase", table: "Sprints");
        }
    }
}
