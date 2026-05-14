using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionDefinitions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SessionDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionDefinitions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SessionDefinitionParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionDefinitionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionDefinitionParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionDefinitionParticipants_SessionDefinitions_SessionDef~",
                        column: x => x.SessionDefinitionId,
                        principalTable: "SessionDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionDefinitionParticipants_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SessionDefinitionSlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionDefinitionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    LocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsConfirmed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionDefinitionSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionDefinitionSlots_SessionDefinitions_SessionDefinition~",
                        column: x => x.SessionDefinitionId,
                        principalTable: "SessionDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionDefinitionSlots_SlotLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "SlotLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SessionDefinitionBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionDefinitionSlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    BookedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionDefinitionBookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionDefinitionBookings_SessionDefinitionSlots_SessionDef~",
                        column: x => x.SessionDefinitionSlotId,
                        principalTable: "SessionDefinitionSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionDefinitionBookings_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SessionDefinitionBookings_SessionDefinitionSlotId_TeamMembe~",
                table: "SessionDefinitionBookings",
                columns: new[] { "SessionDefinitionSlotId", "TeamMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionDefinitionBookings_TeamMemberId",
                table: "SessionDefinitionBookings",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionDefinitionParticipants_SessionDefinitionId",
                table: "SessionDefinitionParticipants",
                column: "SessionDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionDefinitionParticipants_TeamMemberId",
                table: "SessionDefinitionParticipants",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionDefinitions_CreatedByMemberId",
                table: "SessionDefinitions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionDefinitionSlots_LocationId",
                table: "SessionDefinitionSlots",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionDefinitionSlots_SessionDefinitionId",
                table: "SessionDefinitionSlots",
                column: "SessionDefinitionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionDefinitionBookings");

            migrationBuilder.DropTable(
                name: "SessionDefinitionParticipants");

            migrationBuilder.DropTable(
                name: "SessionDefinitionSlots");

            migrationBuilder.DropTable(
                name: "SessionDefinitions");
        }
    }
}
