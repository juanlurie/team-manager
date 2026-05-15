using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMeetingSessionWithSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "BlockedReason",
                table: "WorkItems",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalSubjectId",
                table: "TeamMembers",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "Date",
                table: "MeetingSlots",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "EndTime",
                table: "MeetingSlots",
                type: "interval",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "StartTime",
                table: "MeetingSlots",
                type: "interval",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "MeetingSessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Features",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsCompleted",
                table: "DiscussionTasks",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.CreateTable(
                name: "WinNominations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WinWeekId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomineeMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinNominations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinNominations_TeamMembers_NomineeMemberId",
                        column: x => x.NomineeMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WinNominations_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WinVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WinNominationId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    VotedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinVotes_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WinVotes_WinNominations_WinNominationId",
                        column: x => x.WinNominationId,
                        principalTable: "WinNominations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WinWeeks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WeekStart = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WinnerNominationId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinWeeks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinWeeks_WinNominations_WinnerNominationId",
                        column: x => x.WinnerNominationId,
                        principalTable: "WinNominations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SprintVotes_VoterSprintMemberId",
                table: "SprintVotes",
                column: "VoterSprintMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinNominations_NomineeMemberId",
                table: "WinNominations",
                column: "NomineeMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinNominations_TeamMemberId",
                table: "WinNominations",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinNominations_WinWeekId",
                table: "WinNominations",
                column: "WinWeekId");

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_TeamMemberId",
                table: "WinVotes",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_WinNominationId_TeamMemberId",
                table: "WinVotes",
                columns: new[] { "WinNominationId", "TeamMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_WeekStart",
                table: "WinWeeks",
                column: "WeekStart",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_WinnerNominationId",
                table: "WinWeeks",
                column: "WinnerNominationId");

            migrationBuilder.AddForeignKey(
                name: "FK_WinNominations_WinWeeks_WinWeekId",
                table: "WinNominations",
                column: "WinWeekId",
                principalTable: "WinWeeks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WinNominations_WinWeeks_WinWeekId",
                table: "WinNominations");

            migrationBuilder.DropTable(
                name: "WinVotes");

            migrationBuilder.DropTable(
                name: "WinWeeks");

            migrationBuilder.DropTable(
                name: "WinNominations");

            migrationBuilder.DropIndex(
                name: "IX_SprintVotes_VoterSprintMemberId",
                table: "SprintVotes");

            migrationBuilder.DropColumn(
                name: "Date",
                table: "MeetingSlots");

            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "MeetingSlots");

            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "MeetingSlots");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "MeetingSessions");

            migrationBuilder.AlterColumn<string>(
                name: "BlockedReason",
                table: "WorkItems",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalSubjectId",
                table: "TeamMembers",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Features",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<bool>(
                name: "IsCompleted",
                table: "DiscussionTasks",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");
        }
    }
}
