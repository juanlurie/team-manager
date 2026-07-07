using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroCustomThemes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RetroCustomThemes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroCustomThemes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RetroCustomThemeImages",
                columns: table => new
                {
                    ThemeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Variant = table.Column<string>(type: "text", nullable: false),
                    Data = table.Column<byte[]>(type: "bytea", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroCustomThemeImages", x => new { x.ThemeId, x.Variant });
                    table.ForeignKey(
                        name: "FK_RetroCustomThemeImages_RetroCustomThemes_ThemeId",
                        column: x => x.ThemeId,
                        principalTable: "RetroCustomThemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RetroCustomThemeImages");

            migrationBuilder.DropTable(
                name: "RetroCustomThemes");
        }
    }
}
