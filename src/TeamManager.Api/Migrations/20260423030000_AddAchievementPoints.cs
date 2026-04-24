using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddAchievementPoints : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Points",
                table: "Achievements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // F1-style point values per badge category / key
            migrationBuilder.Sql(@"
                UPDATE ""Achievements"" SET ""Points"" = 25 WHERE ""Category"" = 'SME';
                UPDATE ""Achievements"" SET ""Points"" = 18 WHERE ""Key"" = 'session-host';
                UPDATE ""Achievements"" SET ""Points"" = 15 WHERE ""Key"" = 'lightning-talk';
                UPDATE ""Achievements"" SET ""Points"" = 12 WHERE ""Key"" = 'event-planner';
                UPDATE ""Achievements"" SET ""Points"" = 10 WHERE ""Key"" = 'tournament-champ';
                UPDATE ""Achievements"" SET ""Points"" = 8  WHERE ""Key"" = 'gamer';
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Points", table: "Achievements");
        }
    }
}
