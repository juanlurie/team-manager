using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProcessFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProcessFlowSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "text", nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessFlowSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProcessFlowNodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    PositionX = table.Column<double>(type: "double precision", nullable: false),
                    PositionY = table.Column<double>(type: "double precision", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessFlowNodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcessFlowNodes_ProcessFlowSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ProcessFlowSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcessFlowEdges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessFlowEdges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcessFlowEdges_ProcessFlowNodes_FromNodeId",
                        column: x => x.FromNodeId,
                        principalTable: "ProcessFlowNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProcessFlowEdges_ProcessFlowNodes_ToNodeId",
                        column: x => x.ToNodeId,
                        principalTable: "ProcessFlowNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProcessFlowEdges_ProcessFlowSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ProcessFlowSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProcessFlowEdge_FromNodeId",
                table: "ProcessFlowEdges",
                column: "FromNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessFlowEdge_SessionId",
                table: "ProcessFlowEdges",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessFlowEdge_ToNodeId",
                table: "ProcessFlowEdges",
                column: "ToNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessFlowNode_SessionId",
                table: "ProcessFlowNodes",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProcessFlowEdges");

            migrationBuilder.DropTable(
                name: "ProcessFlowNodes");

            migrationBuilder.DropTable(
                name: "ProcessFlowSessions");
        }
    }
}
