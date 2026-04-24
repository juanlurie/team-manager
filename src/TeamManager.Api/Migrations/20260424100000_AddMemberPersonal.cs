using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddMemberPersonal : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MemberPersonals",
                columns: table => new
                {
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonalMap = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberPersonals", x => x.TeamMemberId);
                    table.ForeignKey(
                        name: "FK_MemberPersonals_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MemberSkills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberSkills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberSkills_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MemberNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberNotes_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MemberTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberTasks_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MemberSkillRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MemberSkillId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    RatedAt = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberSkillRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberSkillRatings_MemberSkills_MemberSkillId",
                        column: x => x.MemberSkillId,
                        principalTable: "MemberSkills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MemberSkills_TeamMemberId",
                table: "MemberSkills",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberNotes_TeamMemberId",
                table: "MemberNotes",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberTasks_TeamMemberId",
                table: "MemberTasks",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberSkillRatings_MemberSkillId",
                table: "MemberSkillRatings",
                column: "MemberSkillId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "MemberSkillRatings");
            migrationBuilder.DropTable(name: "MemberSkills");
            migrationBuilder.DropTable(name: "MemberNotes");
            migrationBuilder.DropTable(name: "MemberTasks");
            migrationBuilder.DropTable(name: "MemberPersonals");
        }
    }
}
