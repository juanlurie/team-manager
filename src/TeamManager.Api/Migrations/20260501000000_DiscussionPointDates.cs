using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class DiscussionPointDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SprintId",
                table: "DiscussionPoints");

            migrationBuilder.AddColumn<DateOnly>(
                name: "StartDate",
                table: "DiscussionPoints",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "TargetDate",
                table: "DiscussionPoints",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "DiscussionPoints");

            migrationBuilder.DropColumn(
                name: "TargetDate",
                table: "DiscussionPoints");

            migrationBuilder.AddColumn<Guid>(
                name: "SprintId",
                table: "DiscussionPoints",
                type: "uuid",
                nullable: true);
        }
    }
}
