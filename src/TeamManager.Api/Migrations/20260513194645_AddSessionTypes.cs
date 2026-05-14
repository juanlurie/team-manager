using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SessionTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionTypes", x => x.Id);
                });

            // Seed default types
            migrationBuilder.InsertData("SessionTypes", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [Guid.NewGuid(), "Workshop", "#4caf50", true, 0]);
            migrationBuilder.InsertData("SessionTypes", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [Guid.NewGuid(), "Presentation", "#42a5f5", true, 1]);
            migrationBuilder.InsertData("SessionTypes", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [Guid.NewGuid(), "Discussion", "#ff9800", true, 2]);
            migrationBuilder.InsertData("SessionTypes", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [Guid.NewGuid(), "Social", "#e91e63", true, 3]);
            migrationBuilder.InsertData("SessionTypes", ["Id", "Name", "Color", "IsActive", "SortOrder"],
                [Guid.NewGuid(), "Standup", "#9c27b0", true, 4]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionTypes");
        }
    }
}
