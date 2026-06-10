using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                name: "ApiRequestConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    Method = table.Column<string>(type: "text", nullable: false),
                    IsFormUrlEncoded = table.Column<bool>(type: "boolean", nullable: false),
                    BodyFormat = table.Column<string>(type: "text", nullable: false),
                    HeadersJson = table.Column<string>(type: "text", nullable: false),
                    BodyTemplate = table.Column<string>(type: "text", nullable: false),
                    MappingJson = table.Column<string>(type: "text", nullable: false),
                    ParametersJson = table.Column<string>(type: "text", nullable: false),
                    StoredCookie = table.Column<string>(type: "text", nullable: true),
                    SecretHeadersJson = table.Column<string>(type: "text", nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    SuccessCriteriaJson = table.Column<string>(type: "text", nullable: true),
                    AutoSync = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiRequestConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ApiSyncEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    ConfigName = table.Column<string>(type: "text", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    SourceId = table.Column<string>(type: "text", nullable: true),
                    SourceType = table.Column<string>(type: "text", nullable: false),
                    ResolvedUrl = table.Column<string>(type: "text", nullable: false),
                    ResolvedHeadersJson = table.Column<string>(type: "text", nullable: false),
                    HttpMethod = table.Column<string>(type: "text", nullable: false),
                    ResolvedBody = table.Column<string>(type: "text", nullable: false),
                    BodyFormat = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ExternalId = table.Column<string>(type: "text", nullable: true),
                    ResponseBody = table.Column<string>(type: "text", nullable: true),
                    ResponseStatus = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiSyncEvents", x => x.Id);
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
                name: "FeaturePermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    FeatureKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeaturePermissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Invitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExternalSubjectId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invitations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JokeHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JokeTypeId = table.Column<string>(type: "text", nullable: false),
                    JokeText = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JokeHistory", x => x.Id);
                });

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

            migrationBuilder.CreateTable(
                name: "PIs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PIs", x => x.Id);
                });

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

            migrationBuilder.CreateTable(
                name: "SlotLocations",
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
                    table.PrimaryKey("PK_SlotLocations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Squads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Squads", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TeamMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    TeamLeadId = table.Column<Guid>(type: "uuid", nullable: true),
                    Crafts = table.Column<string>(type: "text", nullable: false, defaultValueSql: "'[]'"),
                    ExternalSubjectId = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: true),
                    JoinDate = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamMembers_TeamMembers_TeamLeadId",
                        column: x => x.TeamLeadId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TimesheetSystemConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DefaultProjectsJson = table.Column<string>(type: "text", nullable: false),
                    DefaultCategoriesJson = table.Column<string>(type: "text", nullable: false),
                    CorrelationIdsJson = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimesheetSystemConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TimesheetWebhooks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    Method = table.Column<string>(type: "text", nullable: false),
                    HeadersJson = table.Column<string>(type: "text", nullable: false),
                    BodyTemplate = table.Column<string>(type: "text", nullable: false),
                    OnCreate = table.Column<bool>(type: "boolean", nullable: false),
                    OnUpdate = table.Column<bool>(type: "boolean", nullable: false),
                    OnDelete = table.Column<bool>(type: "boolean", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    MaxRetries = table.Column<int>(type: "integer", nullable: false),
                    StoredCookie = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimesheetWebhooks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Wheels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wheels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sprints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PIId = table.Column<Guid>(type: "uuid", nullable: true),
                    SprintNumber = table.Column<int>(type: "integer", nullable: true),
                    IsInnovationSprint = table.Column<bool>(type: "boolean", nullable: false),
                    Goal = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    RetroWentWell = table.Column<string>(type: "text", nullable: true),
                    RetroDidntGoWell = table.Column<string>(type: "text", nullable: true),
                    RetroActionItems = table.Column<string>(type: "text", nullable: true),
                    RetroPhase = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sprints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sprints_PIs_PIId",
                        column: x => x.PIId,
                        principalTable: "PIs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

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
                    Scope = table.Column<string>(type: "text", nullable: false, defaultValue: "Global"),
                    SquadId = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.ForeignKey(
                        name: "FK_Milestones_Squads_SquadId",
                        column: x => x.SquadId,
                        principalTable: "Squads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "AccessRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    GoogleSub = table.Column<string>(type: "text", nullable: true),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReviewedByMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccessRequests_TeamMembers_ReviewedByMemberId",
                        column: x => x.ReviewedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ApiKeys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    KeyHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastUsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiKeys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApiKeys_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRunMenuTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Scope = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRunMenuTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRunMenuTemplates_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRuns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    InitiatorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    OrderDeadline = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
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
                name: "DiscussionPoints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    TargetDate = table.Column<DateOnly>(type: "date", nullable: true),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscussionPoints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiscussionPoints_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "LeaveRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    DaysCount = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveRecords_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeries_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "MemberFeatureOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeatureKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberFeatureOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberFeatureOverrides_TeamMembers_TeamMemberId",
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
                name: "MemberTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
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
                name: "MemberTimesheetConfigs",
                columns: table => new
                {
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExtraProjectsJson = table.Column<string>(type: "text", nullable: false),
                    ExtraCategoriesJson = table.Column<string>(type: "text", nullable: false),
                    QuickActionsJson = table.Column<string>(type: "text", nullable: false),
                    WorkLocationOptionsJson = table.Column<string>(type: "text", nullable: false),
                    BillableProjectsJson = table.Column<string>(type: "text", nullable: false),
                    WorkWeekJson = table.Column<string>(type: "text", nullable: false),
                    MergeEntriesEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LocationIconsJson = table.Column<string>(type: "text", nullable: false),
                    CategoryCorrelationIdsJson = table.Column<string>(type: "text", nullable: false),
                    ExternalEmployeeId = table.Column<string>(type: "text", nullable: true),
                    WorkLocationCorrelationIdsJson = table.Column<string>(type: "text", nullable: false),
                    DeduplicatePendingEditSync = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberTimesheetConfigs", x => x.TeamMemberId);
                    table.ForeignKey(
                        name: "FK_MemberTimesheetConfigs_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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
                name: "ScrumPokerSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    StoryTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Scale = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Revealed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RevealedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResetAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScrumPokerSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScrumPokerSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SquadMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SquadId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SquadMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SquadMembers_Squads_SquadId",
                        column: x => x.SquadId,
                        principalTable: "Squads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SquadMembers_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimesheetEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Project = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Hours = table.Column<int>(type: "integer", nullable: false),
                    Minutes = table.Column<int>(type: "integer", nullable: false),
                    Billable = table.Column<bool>(type: "boolean", nullable: false),
                    WorkedFrom = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Sentiment = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TicketNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExternalId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimesheetEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimesheetEntries_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WinSeries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinSeries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinSeries_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TimesheetWebhookDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WebhookId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastStatusCode = table.Column<int>(type: "integer", nullable: true),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeliveredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimesheetWebhookDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimesheetWebhookDeliveries_TimesheetWebhooks_WebhookId",
                        column: x => x.WebhookId,
                        principalTable: "TimesheetWebhooks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WheelParticipants",
                columns: table => new
                {
                    WheelId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WheelParticipants", x => new { x.WheelId, x.TeamMemberId });
                    table.ForeignKey(
                        name: "FK_WheelParticipants_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WheelParticipants_Wheels_WheelId",
                        column: x => x.WheelId,
                        principalTable: "Wheels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Features",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ExternalTicketRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EstimatedDays = table.Column<decimal>(type: "numeric(6,1)", nullable: true),
                    IsUnplanned = table.Column<bool>(type: "boolean", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Features", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Features_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetroActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    AssignedTo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroActions_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RetroCards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    Column = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroCards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroCards_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SprintMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Capacity = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SprintMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SprintMembers_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SprintMembers_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
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

            migrationBuilder.CreateTable(
                name: "CoffeeRunMenuTemplateItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Sizes = table.Column<string>(type: "text", nullable: true),
                    Additions = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoffeeRunMenuTemplateItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoffeeRunMenuTemplateItems_CoffeeRunMenuTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "CoffeeRunMenuTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRunMenuItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CoffeeRunId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    MaxQuantity = table.Column<int>(type: "integer", nullable: true),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Sizes = table.Column<string>(type: "text", nullable: true),
                    Additions = table.Column<string>(type: "text", nullable: true)
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
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
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
                name: "DiscussionTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    DiscussionPointId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscussionTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiscussionTasks_DiscussionPoints_DiscussionPointId",
                        column: x => x.DiscussionPointId,
                        principalTable: "DiscussionPoints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DiscussionTasks_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesSlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    LocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlots_MeetingSeries_MeetingSeriesId",
                        column: x => x.MeetingSeriesId,
                        principalTable: "MeetingSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlots_SlotLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "SlotLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
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

            migrationBuilder.CreateTable(
                name: "ScrumPokerVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    VotedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScrumPokerVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScrumPokerVotes_ScrumPokerSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ScrumPokerSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ScrumPokerVotes_TeamMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RetroVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CardId = table.Column<Guid>(type: "uuid", nullable: false),
                    VoterId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetroVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetroVotes_RetroCards_CardId",
                        column: x => x.CardId,
                        principalTable: "RetroCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SprintVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    VoterSprintMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomineeSprintMemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SprintVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SprintVotes_SprintMembers_NomineeSprintMemberId",
                        column: x => x.NomineeSprintMemberId,
                        principalTable: "SprintMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SprintVotes_SprintMembers_VoterSprintMemberId",
                        column: x => x.VoterSprintMemberId,
                        principalTable: "SprintMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SprintVotes_Sprints_SprintId",
                        column: x => x.SprintId,
                        principalTable: "Sprints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    SprintMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalTicketRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EstimatedPoints = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    ActualPoints = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    CompletedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    FeatureId = table.Column<Guid>(type: "uuid", nullable: true),
                    BlockedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    BlockedReason = table.Column<string>(type: "text", nullable: true),
                    MilestoneId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkItems_Features_FeatureId",
                        column: x => x.FeatureId,
                        principalTable: "Features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkItems_Milestones_MilestoneId",
                        column: x => x.MilestoneId,
                        principalTable: "Milestones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkItems_SprintMembers_SprintMemberId",
                        column: x => x.SprintMemberId,
                        principalTable: "SprintMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CoffeeRunOrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CoffeeRunOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoffeeRunMenuItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    SelectedSize = table.Column<string>(type: "text", nullable: true),
                    SelectedAdditions = table.Column<string>(type: "text", nullable: true)
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

            migrationBuilder.CreateTable(
                name: "MeetingSeriesItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    ConfirmedSlotId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItems_MeetingSeriesSlots_ConfirmedSlotId",
                        column: x => x.ConfirmedSlotId,
                        principalTable: "MeetingSeriesSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItems_MeetingSeries_MeetingSeriesId",
                        column: x => x.MeetingSeriesId,
                        principalTable: "MeetingSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkItemEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<int>(type: "integer", nullable: false),
                    FromValue = table.Column<string>(type: "text", nullable: true),
                    ToValue = table.Column<string>(type: "text", nullable: true),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    MetadataJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkItemEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkItemEvents_WorkItems_WorkItemId",
                        column: x => x.WorkItemId,
                        principalTable: "WorkItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesItemAvailabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingSeriesSlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesItemAvailabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemAvailabilities_MeetingSeriesItems_MeetingS~",
                        column: x => x.MeetingSeriesItemId,
                        principalTable: "MeetingSeriesItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemAvailabilities_MeetingSeriesSlots_MeetingS~",
                        column: x => x.MeetingSeriesSlotId,
                        principalTable: "MeetingSeriesSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemAvailabilities_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesItemParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesItemParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemParticipants_MeetingSeriesItems_MeetingSer~",
                        column: x => x.MeetingSeriesItemId,
                        principalTable: "MeetingSeriesItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesItemParticipants_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSeriesSlotClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingSeriesSlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingSeriesItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClaimedByMemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSeriesSlotClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_MeetingSeriesItems_MeetingSeriesIte~",
                        column: x => x.MeetingSeriesItemId,
                        principalTable: "MeetingSeriesItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_MeetingSeriesSlots_MeetingSeriesSlo~",
                        column: x => x.MeetingSeriesSlotId,
                        principalTable: "MeetingSeriesSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_MeetingSeries_MeetingSeriesId",
                        column: x => x.MeetingSeriesId,
                        principalTable: "MeetingSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSeriesSlotClaims_TeamMembers_ClaimedByMemberId",
                        column: x => x.ClaimedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    Location = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    MeetingSeriesItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    MeetingSeriesSlotId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSessions_MeetingSeriesItems_MeetingSeriesItemId",
                        column: x => x.MeetingSeriesItemId,
                        principalTable: "MeetingSeriesItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MeetingSessions_MeetingSeriesSlots_MeetingSeriesSlotId",
                        column: x => x.MeetingSeriesSlotId,
                        principalTable: "MeetingSeriesSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MeetingSessions_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MeetingSlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    MeetingSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    LocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: true),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    BookedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingSlots_MeetingSessions_MeetingSessionId",
                        column: x => x.MeetingSessionId,
                        principalTable: "MeetingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingSlots_SlotLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "SlotLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MeetingSlots_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "WinMonthNominations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WinMonthId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceWinWeekId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomineeMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    VoteCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinMonthNominations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinMonthNominations_TeamMembers_NomineeMemberId",
                        column: x => x.NomineeMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WinMonths",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WinnerNominationId = table.Column<Guid>(type: "uuid", nullable: true),
                    OpenedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    VotingEndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinMonths", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinMonths_WinMonthNominations_WinnerNominationId",
                        column: x => x.WinnerNominationId,
                        principalTable: "WinMonthNominations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "WinMonthVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WinMonthNominationId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    VotedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinMonthVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinMonthVotes_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WinMonthVotes_WinMonthNominations_WinMonthNominationId",
                        column: x => x.WinMonthNominationId,
                        principalTable: "WinMonthNominations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WinNominations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    WinWeekId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    GuestName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    GuestSessionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
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
                    TeamMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    GuestSessionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
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
                    WeekEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WinnerNominationId = table.Column<Guid>(type: "uuid", nullable: true),
                    TiedNominationIds = table.Column<string>(type: "text", nullable: true),
                    OpenedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SuddenDeathEndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    WinSeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    WinnerStory = table.Column<string>(type: "text", nullable: true),
                    GuestToken = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WinWeeks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WinWeeks_TeamMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WinWeeks_WinNominations_WinnerNominationId",
                        column: x => x.WinnerNominationId,
                        principalTable: "WinNominations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WinWeeks_WinSeries_WinSeriesId",
                        column: x => x.WinSeriesId,
                        principalTable: "WinSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccessRequests_ReviewedByMemberId",
                table: "AccessRequests",
                column: "ReviewedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Achievements_Key",
                table: "Achievements",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_KeyHash",
                table: "ApiKeys",
                column: "KeyHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_TeamMemberId",
                table: "ApiKeys",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunMenuItems_CoffeeRunId",
                table: "CoffeeRunMenuItems",
                column: "CoffeeRunId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunMenuTemplateItems_TemplateId",
                table: "CoffeeRunMenuTemplateItems",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRunMenuTemplates_CreatedByMemberId",
                table: "CoffeeRunMenuTemplates",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Menu_Template_Scope_Archived",
                table: "CoffeeRunMenuTemplates",
                columns: new[] { "Scope", "IsArchived" });

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
                name: "IX_CoffeeRun_CreatedAt",
                table: "CoffeeRuns",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRun_InitiatorId",
                table: "CoffeeRuns",
                column: "InitiatorId");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRun_Status",
                table: "CoffeeRuns",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_EntityType_EntityId",
                table: "Comments",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_DiscussionPoints_TeamMemberId",
                table: "DiscussionPoints",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_DiscussionTasks_DiscussionPointId",
                table: "DiscussionTasks",
                column: "DiscussionPointId");

            migrationBuilder.CreateIndex(
                name: "IX_DiscussionTasks_TeamMemberId",
                table: "DiscussionTasks",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_FeaturePermission_FeatureKey_Role",
                table: "FeaturePermissions",
                columns: new[] { "FeatureKey", "Role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Features_SprintId",
                table: "Features",
                column: "SprintId");

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_Email",
                table: "Invitations",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRecords_TeamMemberId",
                table: "LeaveRecords",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeries_CreatedByMemberId",
                table: "MeetingSeries",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemAvailabilities_MeetingSeriesItemId_Meeting~",
                table: "MeetingSeriesItemAvailabilities",
                columns: new[] { "MeetingSeriesItemId", "MeetingSeriesSlotId", "TeamMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemAvailabilities_MeetingSeriesSlotId",
                table: "MeetingSeriesItemAvailabilities",
                column: "MeetingSeriesSlotId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemAvailabilities_TeamMemberId",
                table: "MeetingSeriesItemAvailabilities",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemParticipants_MeetingSeriesItemId",
                table: "MeetingSeriesItemParticipants",
                column: "MeetingSeriesItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItemParticipants_TeamMemberId",
                table: "MeetingSeriesItemParticipants",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItems_ConfirmedSlotId",
                table: "MeetingSeriesItems",
                column: "ConfirmedSlotId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesItems_MeetingSeriesId",
                table: "MeetingSeriesItems",
                column: "MeetingSeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlotClaims_ClaimedByMemberId",
                table: "MeetingSeriesSlotClaims",
                column: "ClaimedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlotClaims_MeetingSeriesItemId",
                table: "MeetingSeriesSlotClaims",
                column: "MeetingSeriesItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlotClaims_MeetingSeriesSlotId",
                table: "MeetingSeriesSlotClaims",
                column: "MeetingSeriesSlotId");

            migrationBuilder.CreateIndex(
                name: "UQ_SlotClaim_Series_Slot",
                table: "MeetingSeriesSlotClaims",
                columns: new[] { "MeetingSeriesId", "MeetingSeriesSlotId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlots_LocationId",
                table: "MeetingSeriesSlots",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSeriesSlots_MeetingSeriesId",
                table: "MeetingSeriesSlots",
                column: "MeetingSeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSessions_CreatedByMemberId",
                table: "MeetingSessions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSessions_MeetingSeriesItemId",
                table: "MeetingSessions",
                column: "MeetingSeriesItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSessions_MeetingSeriesSlotId",
                table: "MeetingSessions",
                column: "MeetingSeriesSlotId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSlots_LocationId",
                table: "MeetingSlots",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSlots_MeetingSessionId",
                table: "MeetingSlots",
                column: "MeetingSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingSlots_TeamMemberId",
                table: "MeetingSlots",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberAchievements_AchievementId",
                table: "MemberAchievements",
                column: "AchievementId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberAchievements_TeamMemberId",
                table: "MemberAchievements",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberFeatureOverride_MemberId_FeatureKey",
                table: "MemberFeatureOverrides",
                columns: new[] { "TeamMemberId", "FeatureKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MemberNotes_TeamMemberId",
                table: "MemberNotes",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberSkillRatings_MemberSkillId",
                table: "MemberSkillRatings",
                column: "MemberSkillId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberSkills_TeamMemberId",
                table: "MemberSkills",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberTasks_TeamMemberId",
                table: "MemberTasks",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MilestoneCriteria_MilestoneId",
                table: "MilestoneCriteria",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_PIId",
                table: "Milestones",
                column: "PIId");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_SquadId",
                table: "Milestones",
                column: "SquadId");

            migrationBuilder.CreateIndex(
                name: "IX_PointAwards_TeamMemberId",
                table: "PointAwards",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroActions_SprintId",
                table: "RetroActions",
                column: "SprintId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroCards_SprintId",
                table: "RetroCards",
                column: "SprintId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroVotes_CardId",
                table: "RetroVotes",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_RetroVotes_CardId_VoterId",
                table: "RetroVotes",
                columns: new[] { "CardId", "VoterId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScrumPokerSession_CreatedAt",
                table: "ScrumPokerSessions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ScrumPokerSession_CreatedByMemberId",
                table: "ScrumPokerSessions",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_ScrumPokerVote_MemberId",
                table: "ScrumPokerVotes",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_ScrumPokerVote_SessionId",
                table: "ScrumPokerVotes",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ScrumPokerVote_SessionId_MemberId",
                table: "ScrumPokerVotes",
                columns: new[] { "SessionId", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SprintMembers_SprintId_TeamMemberId",
                table: "SprintMembers",
                columns: new[] { "SprintId", "TeamMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SprintMembers_TeamMemberId",
                table: "SprintMembers",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Sprints_PIId",
                table: "Sprints",
                column: "PIId");

            migrationBuilder.CreateIndex(
                name: "IX_SprintVotes_NomineeSprintMemberId",
                table: "SprintVotes",
                column: "NomineeSprintMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_SprintVotes_SprintId_VoterSprintMemberId",
                table: "SprintVotes",
                columns: new[] { "SprintId", "VoterSprintMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SprintVotes_VoterSprintMemberId",
                table: "SprintVotes",
                column: "VoterSprintMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_SquadMembers_SquadId_TeamMemberId",
                table: "SquadMembers",
                columns: new[] { "SquadId", "TeamMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SquadMembers_TeamMemberId",
                table: "SquadMembers",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_Email",
                table: "TeamMembers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_TeamLeadId",
                table: "TeamMembers",
                column: "TeamLeadId");

            migrationBuilder.CreateIndex(
                name: "IX_TimesheetEntries_TeamMemberId_Date",
                table: "TimesheetEntries",
                columns: new[] { "TeamMemberId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_TimesheetWebhookDeliveries_WebhookId",
                table: "TimesheetWebhookDeliveries",
                column: "WebhookId");

            migrationBuilder.CreateIndex(
                name: "IX_WheelParticipants_TeamMemberId",
                table: "WheelParticipants",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthNominations_NomineeMemberId",
                table: "WinMonthNominations",
                column: "NomineeMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthNominations_SourceWinWeekId",
                table: "WinMonthNominations",
                column: "SourceWinWeekId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthNominations_WinMonthId_NomineeMemberId",
                table: "WinMonthNominations",
                columns: new[] { "WinMonthId", "NomineeMemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinMonths_WinnerNominationId",
                table: "WinMonths",
                column: "WinnerNominationId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonths_Year_Month",
                table: "WinMonths",
                columns: new[] { "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthVotes_TeamMemberId",
                table: "WinMonthVotes",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinMonthVotes_WinMonthNominationId_TeamMemberId",
                table: "WinMonthVotes",
                columns: new[] { "WinMonthNominationId", "TeamMemberId" },
                unique: true);

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
                name: "IX_WinSeries_CreatedByMemberId",
                table: "WinSeries",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_TeamMemberId",
                table: "WinVotes",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_WinNominationId_GuestSessionId",
                table: "WinVotes",
                columns: new[] { "WinNominationId", "GuestSessionId" },
                unique: true,
                filter: "\"GuestSessionId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WinVotes_WinNominationId_TeamMemberId",
                table: "WinVotes",
                columns: new[] { "WinNominationId", "TeamMemberId" },
                unique: true,
                filter: "\"TeamMemberId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_CreatedByMemberId",
                table: "WinWeeks",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_GuestToken",
                table: "WinWeeks",
                column: "GuestToken",
                unique: true,
                filter: "\"GuestToken\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_WinnerNominationId",
                table: "WinWeeks",
                column: "WinnerNominationId");

            migrationBuilder.CreateIndex(
                name: "IX_WinWeeks_WinSeriesId_WeekStart",
                table: "WinWeeks",
                columns: new[] { "WinSeriesId", "WeekStart" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkItemEvents_WorkItemId",
                table: "WorkItemEvents",
                column: "WorkItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_FeatureId",
                table: "WorkItems",
                column: "FeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_MilestoneId",
                table: "WorkItems",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_SprintMemberId",
                table: "WorkItems",
                column: "SprintMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_WinMonthNominations_WinMonths_WinMonthId",
                table: "WinMonthNominations",
                column: "WinMonthId",
                principalTable: "WinMonths",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WinMonthNominations_WinWeeks_SourceWinWeekId",
                table: "WinMonthNominations",
                column: "SourceWinWeekId",
                principalTable: "WinWeeks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

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
                name: "FK_WinMonthNominations_TeamMembers_NomineeMemberId",
                table: "WinMonthNominations");

            migrationBuilder.DropForeignKey(
                name: "FK_WinNominations_TeamMembers_NomineeMemberId",
                table: "WinNominations");

            migrationBuilder.DropForeignKey(
                name: "FK_WinNominations_TeamMembers_TeamMemberId",
                table: "WinNominations");

            migrationBuilder.DropForeignKey(
                name: "FK_WinSeries_TeamMembers_CreatedByMemberId",
                table: "WinSeries");

            migrationBuilder.DropForeignKey(
                name: "FK_WinWeeks_TeamMembers_CreatedByMemberId",
                table: "WinWeeks");

            migrationBuilder.DropForeignKey(
                name: "FK_WinMonthNominations_WinMonths_WinMonthId",
                table: "WinMonthNominations");

            migrationBuilder.DropForeignKey(
                name: "FK_WinNominations_WinWeeks_WinWeekId",
                table: "WinNominations");

            migrationBuilder.DropTable(
                name: "AccessRequests");

            migrationBuilder.DropTable(
                name: "ApiKeys");

            migrationBuilder.DropTable(
                name: "ApiRequestConfigs");

            migrationBuilder.DropTable(
                name: "ApiSyncEvents");

            migrationBuilder.DropTable(
                name: "CoffeeRunMenuTemplateItems");

            migrationBuilder.DropTable(
                name: "CoffeeRunOrderItems");

            migrationBuilder.DropTable(
                name: "Comments");

            migrationBuilder.DropTable(
                name: "DiscussionTasks");

            migrationBuilder.DropTable(
                name: "FeaturePermissions");

            migrationBuilder.DropTable(
                name: "Invitations");

            migrationBuilder.DropTable(
                name: "JokeHistory");

            migrationBuilder.DropTable(
                name: "LeaveFetchConfigs");

            migrationBuilder.DropTable(
                name: "LeaveRecords");

            migrationBuilder.DropTable(
                name: "MeetingSeriesItemAvailabilities");

            migrationBuilder.DropTable(
                name: "MeetingSeriesItemParticipants");

            migrationBuilder.DropTable(
                name: "MeetingSeriesSlotClaims");

            migrationBuilder.DropTable(
                name: "MeetingSlots");

            migrationBuilder.DropTable(
                name: "MemberAchievements");

            migrationBuilder.DropTable(
                name: "MemberFeatureOverrides");

            migrationBuilder.DropTable(
                name: "MemberNotes");

            migrationBuilder.DropTable(
                name: "MemberPersonals");

            migrationBuilder.DropTable(
                name: "MemberSkillRatings");

            migrationBuilder.DropTable(
                name: "MemberTasks");

            migrationBuilder.DropTable(
                name: "MemberTimesheetConfigs");

            migrationBuilder.DropTable(
                name: "MilestoneCriteria");

            migrationBuilder.DropTable(
                name: "PointAwards");

            migrationBuilder.DropTable(
                name: "RetroActions");

            migrationBuilder.DropTable(
                name: "RetroVotes");

            migrationBuilder.DropTable(
                name: "ScrumPokerVotes");

            migrationBuilder.DropTable(
                name: "SessionTypes");

            migrationBuilder.DropTable(
                name: "SprintVotes");

            migrationBuilder.DropTable(
                name: "SquadMembers");

            migrationBuilder.DropTable(
                name: "TimesheetEntries");

            migrationBuilder.DropTable(
                name: "TimesheetSystemConfigs");

            migrationBuilder.DropTable(
                name: "TimesheetWebhookDeliveries");

            migrationBuilder.DropTable(
                name: "WheelParticipants");

            migrationBuilder.DropTable(
                name: "WinMonthVotes");

            migrationBuilder.DropTable(
                name: "WinVotes");

            migrationBuilder.DropTable(
                name: "WorkItemEvents");

            migrationBuilder.DropTable(
                name: "CoffeeRunMenuTemplates");

            migrationBuilder.DropTable(
                name: "CoffeeRunMenuItems");

            migrationBuilder.DropTable(
                name: "CoffeeRunOrders");

            migrationBuilder.DropTable(
                name: "DiscussionPoints");

            migrationBuilder.DropTable(
                name: "MeetingSessions");

            migrationBuilder.DropTable(
                name: "Achievements");

            migrationBuilder.DropTable(
                name: "MemberSkills");

            migrationBuilder.DropTable(
                name: "RetroCards");

            migrationBuilder.DropTable(
                name: "ScrumPokerSessions");

            migrationBuilder.DropTable(
                name: "TimesheetWebhooks");

            migrationBuilder.DropTable(
                name: "Wheels");

            migrationBuilder.DropTable(
                name: "WorkItems");

            migrationBuilder.DropTable(
                name: "CoffeeRuns");

            migrationBuilder.DropTable(
                name: "MeetingSeriesItems");

            migrationBuilder.DropTable(
                name: "Features");

            migrationBuilder.DropTable(
                name: "Milestones");

            migrationBuilder.DropTable(
                name: "SprintMembers");

            migrationBuilder.DropTable(
                name: "MeetingSeriesSlots");

            migrationBuilder.DropTable(
                name: "Squads");

            migrationBuilder.DropTable(
                name: "Sprints");

            migrationBuilder.DropTable(
                name: "MeetingSeries");

            migrationBuilder.DropTable(
                name: "SlotLocations");

            migrationBuilder.DropTable(
                name: "PIs");

            migrationBuilder.DropTable(
                name: "TeamMembers");

            migrationBuilder.DropTable(
                name: "WinMonths");

            migrationBuilder.DropTable(
                name: "WinMonthNominations");

            migrationBuilder.DropTable(
                name: "WinWeeks");

            migrationBuilder.DropTable(
                name: "WinNominations");

            migrationBuilder.DropTable(
                name: "WinSeries");
        }
    }
}
