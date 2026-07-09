using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCanvasNodeSize : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Height",
                table: "ProcessFlowNodes",
                type: "double precision",
                nullable: false,
                defaultValue: 64.0);

            migrationBuilder.AddColumn<double>(
                name: "Width",
                table: "ProcessFlowNodes",
                type: "double precision",
                nullable: false,
                defaultValue: 160.0);

            migrationBuilder.AddColumn<double>(
                name: "Height",
                table: "PersonalMapNodes",
                type: "double precision",
                nullable: false,
                defaultValue: 64.0);

            migrationBuilder.AddColumn<double>(
                name: "Width",
                table: "PersonalMapNodes",
                type: "double precision",
                nullable: false,
                defaultValue: 160.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Height",
                table: "ProcessFlowNodes");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "ProcessFlowNodes");

            migrationBuilder.DropColumn(
                name: "Height",
                table: "PersonalMapNodes");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "PersonalMapNodes");
        }
    }
}
