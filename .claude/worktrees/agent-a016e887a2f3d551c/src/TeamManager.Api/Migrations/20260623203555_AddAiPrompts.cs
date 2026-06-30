using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAiPrompts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAiConnection",
                table: "ApiRequestConfigs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AiPrompts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SystemPrompt = table.Column<string>(type: "text", nullable: false),
                    UserMessageTemplate = table.Column<string>(type: "text", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiPrompts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiPrompts_ApiRequestConfigs_ConnectionId",
                        column: x => x.ConnectionId,
                        principalTable: "ApiRequestConfigs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiPrompt_Key",
                table: "AiPrompts",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiPrompts_ConnectionId",
                table: "AiPrompts",
                column: "ConnectionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiPrompts");

            migrationBuilder.DropColumn(
                name: "IsAiConnection",
                table: "ApiRequestConfigs");
        }
    }
}
