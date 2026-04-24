using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddAchievements : Migration
    {
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
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Achievements", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Achievements_Key",
                table: "Achievements",
                column: "Key",
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_MemberAchievements_AchievementId",
                table: "MemberAchievements",
                column: "AchievementId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberAchievements_TeamMemberId",
                table: "MemberAchievements",
                column: "TeamMemberId");

            migrationBuilder.Sql(@"
                INSERT INTO ""Achievements"" (""Id"", ""Key"", ""Name"", ""Description"", ""Icon"", ""Category"") VALUES
                ('a1000000-0000-0000-0000-000000000001', 'backend-sme',      'Backend SME',         'Subject Matter Expert in backend development',     '🎓', 'SME'),
                ('a1000000-0000-0000-0000-000000000002', 'frontend-sme',     'Frontend SME',        'Subject Matter Expert in frontend development',    '🎨', 'SME'),
                ('a1000000-0000-0000-0000-000000000003', 'mobile-sme',       'Mobile SME',          'Subject Matter Expert in mobile development',      '📱', 'SME'),
                ('a1000000-0000-0000-0000-000000000004', 'devops-sme',       'DevOps SME',          'Subject Matter Expert in DevOps & infrastructure', '⚙️', 'SME'),
                ('a1000000-0000-0000-0000-000000000005', 'data-sme',         'Data SME',            'Subject Matter Expert in data & analytics',        '📊', 'SME'),
                ('a1000000-0000-0000-0000-000000000006', 'qa-sme',           'QA SME',              'Subject Matter Expert in quality assurance',       '🔍', 'SME'),
                ('a1000000-0000-0000-0000-000000000007', 'agile-sme',        'Agile SME',           'Subject Matter Expert in agile practices',         '🏃', 'SME'),
                ('a1000000-0000-0000-0000-000000000008', 'architecture-sme', 'Architecture SME',    'Subject Matter Expert in system architecture',     '🏗️', 'SME'),
                ('a1000000-0000-0000-0000-000000000009', 'security-sme',     'Security SME',        'Subject Matter Expert in security',                '🔐', 'SME'),
                ('a2000000-0000-0000-0000-000000000001', 'session-host',     'Session Host',        'Hosted a knowledge sharing session',               '🎤', 'Knowledge'),
                ('a2000000-0000-0000-0000-000000000002', 'lightning-talk',   'Lightning Talk',      'Delivered a lightning talk to the team',           '⚡', 'Knowledge'),
                ('a3000000-0000-0000-0000-000000000001', 'event-planner',    'Event Planner',       'Planned a team social event',                     '🎉', 'Social'),
                ('a4000000-0000-0000-0000-000000000001', 'gamer',            'Gamer',               'Joined a team gaming session',                    '🎮', 'Fun'),
                ('a4000000-0000-0000-0000-000000000002', 'tournament-champ', 'Tournament Champion', 'Won a team tournament',                           '🏆', 'Fun')
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "MemberAchievements");
            migrationBuilder.DropTable(name: "Achievements");
        }
    }
}
