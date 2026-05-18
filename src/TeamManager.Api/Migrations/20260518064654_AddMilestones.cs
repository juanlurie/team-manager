using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMilestones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MilestoneId",
                table: "WorkItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Milestones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    PIId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    TargetDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Milestones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Milestones_PIs_PIId",
                        column: x => x.PIId,
                        principalTable: "PIs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MilestoneCriteria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MilestoneId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    Completed = table.Column<bool>(type: "boolean", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MilestoneCriteria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MilestoneCriteria_Milestones_MilestoneId",
                        column: x => x.MilestoneId,
                        principalTable: "Milestones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_MilestoneId",
                table: "WorkItems",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_MilestoneCriteria_MilestoneId",
                table: "MilestoneCriteria",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_PIId",
                table: "Milestones",
                column: "PIId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkItems_Milestones_MilestoneId",
                table: "WorkItems",
                column: "MilestoneId",
                principalTable: "Milestones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkItems_Milestones_MilestoneId",
                table: "WorkItems");

            migrationBuilder.DropTable(
                name: "MilestoneCriteria");

            migrationBuilder.DropTable(
                name: "Milestones");

            migrationBuilder.DropIndex(
                name: "IX_WorkItems_MilestoneId",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "MilestoneId",
                table: "WorkItems");
        }
    }
}
