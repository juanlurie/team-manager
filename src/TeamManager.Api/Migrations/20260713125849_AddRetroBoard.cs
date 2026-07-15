using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRetroBoard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RetroBoardSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Slug = table.Column<string>(type: "text", nullable: true),
                    Title = table.Column<string>(type: "text", nullable: true),
                    SquadId = table.Column<Guid>(type: "uuid", nullable: true),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phase = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    VotesPerUser = table.Column<int>(type: "integer", nullable: false),
                    AllowAnonymous = table.Column<bool>(type: "boolean", nullable: false),
                    HideNotesUntilReveal = table.Column<bool>(type: "boolean", nullable: false),
                    NotesRevealed = table.Column<bool>(type: "boolean", nullable: false),
                    StepDurationsJson = table.Column<string>(type: "text", nullable: true),
                    LiveStateJson = table.Column<string>(type: "text", nullable: true),
                    InviteEmailsJson = table.Column<string>(type: "text", nullable: true),
                    AiSummaryJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardSessions_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RetroBoardSessions_Squads_SquadId",
                        column: x => x.SquadId,
                        principalTable: "Squads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RetroBoardSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardColumns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Color = table.Column<string>(type: "text", nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardColumns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardColumns_RetroBoardSessions_RetroBoardSessionId",
                        column: x => x.RetroBoardSessionId,
                        principalTable: "RetroBoardSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    IsSelfPaced = table.Column<bool>(type: "boolean", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardParticipants_RetroBoardSessions_RetroBoardSession~",
                        column: x => x.RetroBoardSessionId,
                        principalTable: "RetroBoardSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetroBoardParticipants_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RetroBoardColumnId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsAnonymous = table.Column<bool>(type: "boolean", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    Flagged = table.Column<bool>(type: "boolean", nullable: false),
                    Clarification = table.Column<string>(type: "text", nullable: true),
                    IntroducedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardNotes_RetroBoardColumns_RetroBoardColumnId",
                        column: x => x.RetroBoardColumnId,
                        principalTable: "RetroBoardColumns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RetroBoardNotes_RetroBoardSessions_RetroBoardSessionId",
                        column: x => x.RetroBoardSessionId,
                        principalTable: "RetroBoardSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetroBoardNotes_TeamMembers_AuthorMemberId",
                        column: x => x.AuthorMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardParticipantProgress",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phase = table.Column<string>(type: "text", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardParticipantProgress", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardParticipantProgress_RetroBoardParticipants_RetroB~",
                        column: x => x.RetroBoardParticipantId,
                        principalTable: "RetroBoardParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceNoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "text", nullable: false),
                    OwnerMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsAiSuggested = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardActions_RetroBoardNotes_SourceNoteId",
                        column: x => x.SourceNoteId,
                        principalTable: "RetroBoardNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RetroBoardActions_RetroBoardSessions_RetroBoardSessionId",
                        column: x => x.RetroBoardSessionId,
                        principalTable: "RetroBoardSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetroBoardActions_TeamMembers_OwnerMemberId",
                        column: x => x.OwnerMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardVotes_RetroBoardNotes_RetroBoardNoteId",
                        column: x => x.RetroBoardNoteId,
                        principalTable: "RetroBoardNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetroBoardVotes_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardCheckinQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    ContextText = table.Column<string>(type: "text", nullable: true),
                    SourceActionId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardCheckinQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardCheckinQuestions_RetroBoardActions_SourceActionId",
                        column: x => x.SourceActionId,
                        principalTable: "RetroBoardActions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RetroBoardCheckinQuestions_RetroBoardSessions_RetroBoardSes~",
                        column: x => x.RetroBoardSessionId,
                        principalTable: "RetroBoardSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetroBoardCheckinResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RetroBoardCheckinQuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroBoardCheckinResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroBoardCheckinResponses_RetroBoardCheckinQuestions_Retro~",
                        column: x => x.RetroBoardCheckinQuestionId,
                        principalTable: "RetroBoardCheckinQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetroBoardCheckinResponses_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardAction_SessionId",
                table: "RetroBoardActions",
                column: "RetroBoardSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardActions_OwnerMemberId",
                table: "RetroBoardActions",
                column: "OwnerMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardActions_SourceNoteId",
                table: "RetroBoardActions",
                column: "SourceNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardCheckinQuestion_SessionId",
                table: "RetroBoardCheckinQuestions",
                column: "RetroBoardSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardCheckinQuestions_SourceActionId",
                table: "RetroBoardCheckinQuestions",
                column: "SourceActionId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardCheckinResponse_QuestionId_MemberId",
                table: "RetroBoardCheckinResponses",
                columns: new[] { "RetroBoardCheckinQuestionId", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardCheckinResponses_MemberId",
                table: "RetroBoardCheckinResponses",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardColumn_SessionId",
                table: "RetroBoardColumns",
                column: "RetroBoardSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardNote_ColumnId",
                table: "RetroBoardNotes",
                column: "RetroBoardColumnId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardNote_SessionId",
                table: "RetroBoardNotes",
                column: "RetroBoardSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardNotes_AuthorMemberId",
                table: "RetroBoardNotes",
                column: "AuthorMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardParticipantProgress_ParticipantId_Phase",
                table: "RetroBoardParticipantProgress",
                columns: new[] { "RetroBoardParticipantId", "Phase" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardParticipant_SessionId_MemberId",
                table: "RetroBoardParticipants",
                columns: new[] { "RetroBoardSessionId", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardParticipants_MemberId",
                table: "RetroBoardParticipants",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardSession_CreatedByMemberId",
                table: "RetroBoardSessions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardSession_Slug",
                table: "RetroBoardSessions",
                column: "Slug",
                unique: true,
                filter: "\"Slug\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardSession_SquadId",
                table: "RetroBoardSessions",
                column: "SquadId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardSessions_SprintId",
                table: "RetroBoardSessions",
                column: "SprintId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardVote_NoteId_MemberId",
                table: "RetroBoardVotes",
                columns: new[] { "RetroBoardNoteId", "MemberId" });

            migrationBuilder.CreateIndex(
                name: "IX_RetroBoardVotes_MemberId",
                table: "RetroBoardVotes",
                column: "MemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RetroBoardCheckinResponses");

            migrationBuilder.DropTable(
                name: "RetroBoardParticipantProgress");

            migrationBuilder.DropTable(
                name: "RetroBoardVotes");

            migrationBuilder.DropTable(
                name: "RetroBoardCheckinQuestions");

            migrationBuilder.DropTable(
                name: "RetroBoardParticipants");

            migrationBuilder.DropTable(
                name: "RetroBoardActions");

            migrationBuilder.DropTable(
                name: "RetroBoardNotes");

            migrationBuilder.DropTable(
                name: "RetroBoardColumns");

            migrationBuilder.DropTable(
                name: "RetroBoardSessions");
        }
    }
}
