using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFunRetroVoteCaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing sessions keep today's behaviour: one vote per card, a 3-vote session budget.
            migrationBuilder.AddColumn<int>(
                name: "MaxVotesPerCard",
                table: "FunRetroSessions",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "VotesPerUser",
                table: "FunRetroSessions",
                type: "integer",
                nullable: true,
                defaultValue: 3);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxVotesPerCard",
                table: "FunRetroSessions");

            migrationBuilder.DropColumn(
                name: "VotesPerUser",
                table: "FunRetroSessions");
        }
    }
}
