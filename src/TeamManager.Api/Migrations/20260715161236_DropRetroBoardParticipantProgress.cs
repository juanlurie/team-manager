using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class DropRetroBoardParticipantProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RetroBoardParticipantProgress");

            migrationBuilder.DropColumn(
                name: "IsSelfPaced",
                table: "RetroBoardParticipants");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSelfPaced",
                table: "RetroBoardParticipants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "RetroBoardParticipantProgress",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Phase = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardParticipantProgress", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardParticipantProgress_RetroBoardParticipants_RetroB~",
                        column: x => x.RetroBoardParticipantId,
                        principalTable: "RetroBoardParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardParticipantProgress_ParticipantId_Phase",
                table: "RetroBoardParticipantProgress",
                columns: new[] { "RetroBoardParticipantId", "Phase" },
                unique: true);
        }
    }
}
