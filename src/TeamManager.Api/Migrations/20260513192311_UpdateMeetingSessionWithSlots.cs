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

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedDays",
                table: "Features",
                type: "numeric(6,1)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsUnplanned",
                table: "Features",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "StartDate",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsCompleted",
                table: "DiscussionTasks",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "TeamMemberId",
                table: "DiscussionPoints",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Achievements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Key = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Icon = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Achievements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Comments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    EntityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PointAwards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AwardedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PointAwards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PointAwards_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MemberAchievements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    AchievementId = table.Column<Guid>(type: "uuid", nullable: false),
                    AwardedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberAchievements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberAchievements_Achievements_AchievementId",
                        column: x => x.AchievementId,
                        principalTable: "Achievements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MemberAchievements_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

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
                    WinnerNominationId = table.Column<Guid>(type: "uuid", nullable: true),
                    OpenedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
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
                name: "IX_DiscussionPoints_TeamMemberId",
                table: "DiscussionPoints",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Achievements_Key",
                table: "Achievements",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comments_EntityType_EntityId",
                table: "Comments",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_MemberAchievements_AchievementId",
                table: "MemberAchievements",
                column: "AchievementId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberAchievements_TeamMemberId",
                table: "MemberAchievements",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_PointAwards_TeamMemberId",
                table: "PointAwards",
                column: "TeamMemberId");

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
                name: "FK_DiscussionPoints_TeamMembers_TeamMemberId",
                table: "DiscussionPoints",
                column: "TeamMemberId",
                principalTable: "TeamMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

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
                name: "FK_DiscussionPoints_TeamMembers_TeamMemberId",
                table: "DiscussionPoints");

            migrationBuilder.DropForeignKey(
                name: "FK_WinNominations_WinWeeks_WinWeekId",
                table: "WinNominations");

            migrationBuilder.DropTable(
                name: "Comments");

            migrationBuilder.DropTable(
                name: "MemberAchievements");

            migrationBuilder.DropTable(
                name: "PointAwards");

            migrationBuilder.DropTable(
                name: "WinVotes");

            migrationBuilder.DropTable(
                name: "Achievements");

            migrationBuilder.DropTable(
                name: "WinWeeks");

            migrationBuilder.DropTable(
                name: "WinNominations");

            migrationBuilder.DropIndex(
                name: "IX_SprintVotes_VoterSprintMemberId",
                table: "SprintVotes");

            migrationBuilder.DropIndex(
                name: "IX_DiscussionPoints_TeamMemberId",
                table: "DiscussionPoints");

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

            migrationBuilder.DropColumn(
                name: "EstimatedDays",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "IsUnplanned",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "TeamMemberId",
                table: "DiscussionPoints");

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
