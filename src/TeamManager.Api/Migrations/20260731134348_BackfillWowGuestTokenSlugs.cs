using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class BackfillWowGuestTokenSlugs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Pre-AddFriendlySlugs guest tokens are long base64url strings; slugs are
            // "adjective-noun" (optionally with a 4-hex-char collision suffix). Clearing
            // old-format tokens makes GetOrGenerateGuestTokenAsync regenerate a slug on next
            // access -- this invalidates any already-shared old-style guest links, an accepted
            // tradeoff so every WinWeek ends up with a short shareable URL after deploy.
            migrationBuilder.Sql(
                "UPDATE \"WinWeeks\" SET \"GuestToken\" = NULL " +
                "WHERE \"GuestToken\" IS NOT NULL AND \"GuestToken\" !~ '^[a-z]+-[a-z]+(-[0-9a-f]{4})?$';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Old tokens aren't recoverable once cleared.
        }
    }
}
