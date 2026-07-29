using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWowSeriesLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxNominationsPerPerson",
                table: "WinSeries",
                type: "integer",
                nullable: false,
                // Existing series keep the previously hard-coded budget of 3.
                defaultValue: 3);

            migrationBuilder.AddColumn<int>(
                name: "MaxVotesPerPerson",
                table: "WinSeries",
                type: "integer",
                nullable: false,
                defaultValue: 3);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxNominationsPerPerson",
                table: "WinSeries");

            migrationBuilder.DropColumn(
                name: "MaxVotesPerPerson",
                table: "WinSeries");
        }
    }
}
