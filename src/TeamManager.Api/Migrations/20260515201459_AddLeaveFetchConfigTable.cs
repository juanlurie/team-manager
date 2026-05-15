using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveFetchConfigTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LeaveFetchConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    Method = table.Column<string>(type: "text", nullable: false),
                    IsFormUrlEncoded = table.Column<bool>(type: "boolean", nullable: false),
                    HeadersJson = table.Column<string>(type: "text", nullable: false),
                    BodyTemplate = table.Column<string>(type: "text", nullable: false),
                    MappingJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveFetchConfigs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LeaveFetchConfigs");
        }
    }
}
