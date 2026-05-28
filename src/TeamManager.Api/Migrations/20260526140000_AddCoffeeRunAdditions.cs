using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCoffeeRunAdditions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Additions",
                table: "CoffeeRunMenuItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Additions",
                table: "CoffeeRunMenuTemplateItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SelectedAdditions",
                table: "CoffeeRunOrderItems",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Additions", table: "CoffeeRunMenuItems");
            migrationBuilder.DropColumn(name: "Additions", table: "CoffeeRunMenuTemplateItems");
            migrationBuilder.DropColumn(name: "SelectedAdditions", table: "CoffeeRunOrderItems");
        }
    }
}
