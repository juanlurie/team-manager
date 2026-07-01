using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HideCardsOnAdd",
                table: "FunRetroSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ParticipationTracking",
                table: "FunRetroSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HideCardsOnAdd",
                table: "FunRetroSessions");

            migrationBuilder.DropColumn(
                name: "ParticipationTracking",
                table: "FunRetroSessions");
        }
    }
}
