using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedInitialTeamLead : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                INSERT INTO ""TeamMembers"" (""Id"", ""FirstName"", ""LastName"", ""Email"", ""Role"", ""ExternalSubjectId"", ""IsActive"", ""CreatedAt"", ""Crafts"")
                SELECT gen_random_uuid(), 'Admin', 'User', 'admin@team.local', 'TeamLead', 'PLACEHOLDER_GOOGLE_SUB', true, NOW(), '[]'
                WHERE NOT EXISTS (SELECT 1 FROM ""TeamMembers"" LIMIT 1);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DELETE FROM ""TeamMembers"" WHERE ""Email"" = 'admin@team.local';");
        }
    }
}
