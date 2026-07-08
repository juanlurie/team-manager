using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroCustomThemeOverridesBuiltIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OverridesBuiltInId",
                table: "RetroCustomThemes",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroCustomThemes_OverridesBuiltInId",
                table: "RetroCustomThemes",
                column: "OverridesBuiltInId",
                unique: true,
                filter: "\"OverridesBuiltInId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RetroCustomThemes_OverridesBuiltInId",
                table: "RetroCustomThemes");

            migrationBuilder.DropColumn(
                name: "OverridesBuiltInId",
                table: "RetroCustomThemes");
        }
    }
}
