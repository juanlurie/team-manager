using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddMenuTemplates : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CoffeeRunMenuTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRunMenuTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRunMenuTemplates_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRunMenuTemplateItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRunMenuTemplateItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRunMenuTemplateItems_CoffeeRunMenuTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "CoffeeRunMenuTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunMenuTemplateItems_TemplateId",
                table: "CoffeeRunMenuTemplateItems",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunMenuTemplates_CreatedByMemberId",
                table: "CoffeeRunMenuTemplates",
                column: "CreatedByMemberId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "CoffeeRunMenuTemplateItems");
            migrationBuilder.DropTable(name: "CoffeeRunMenuTemplates");
        }
    }
}
