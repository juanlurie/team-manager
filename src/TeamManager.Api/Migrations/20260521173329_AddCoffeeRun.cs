using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCoffeeRun : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CoffeeRuns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    InitiatorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRuns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRuns_TeamMembers_InitiatorId",
                        column: x => x.InitiatorId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRunMenuItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CoffeeRunId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRunMenuItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRunMenuItems_CoffeeRuns_CoffeeRunId",
                        column: x => x.CoffeeRunId,
                        principalTable: "CoffeeRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRunOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CoffeeRunId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRunOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRunOrders_CoffeeRuns_CoffeeRunId",
                        column: x => x.CoffeeRunId,
                        principalTable: "CoffeeRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CoffeeRunOrders_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRunOrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CoffeeRunOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoffeeRunMenuItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRunOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRunOrderItems_CoffeeRunMenuItems_CoffeeRunMenuItemId",
                        column: x => x.CoffeeRunMenuItemId,
                        principalTable: "CoffeeRunMenuItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CoffeeRunOrderItems_CoffeeRunOrders_CoffeeRunOrderId",
                        column: x => x.CoffeeRunOrderId,
                        principalTable: "CoffeeRunOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunMenuItems_CoffeeRunId",
                table: "CoffeeRunMenuItems",
                column: "CoffeeRunId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunOrderItems_CoffeeRunMenuItemId",
                table: "CoffeeRunOrderItems",
                column: "CoffeeRunMenuItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunOrderItems_CoffeeRunOrderId",
                table: "CoffeeRunOrderItems",
                column: "CoffeeRunOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunOrders_CoffeeRunId_TeamMemberId",
                table: "CoffeeRunOrders",
                columns: new[] { "CoffeeRunId", "TeamMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunOrders_TeamMemberId",
                table: "CoffeeRunOrders",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRuns_InitiatorId",
                table: "CoffeeRuns",
                column: "InitiatorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoffeeRunOrderItems");

            migrationBuilder.DropTable(
                name: "CoffeeRunMenuItems");

            migrationBuilder.DropTable(
                name: "CoffeeRunOrders");

            migrationBuilder.DropTable(
                name: "CoffeeRuns");
        }
    }
}
