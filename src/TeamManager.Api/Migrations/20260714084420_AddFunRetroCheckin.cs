using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFunRetroCheckin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CheckinEnabled",
                table: "FunRetroSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "FunRetroCheckinQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    ContextText = table.Column<string>(type: "text", nullable: true),
                    SourceCardId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunRetroCheckinQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunRetroCheckinQuestions_FunRetroSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "FunRetroSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FunRetroCheckinResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunRetroCheckinResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FunRetroCheckinResponses_FunRetroCheckinQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "FunRetroCheckinQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroCheckinQuestion_SessionId",
                table: "FunRetroCheckinQuestions",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_FunRetroCheckinResponse_Question_Member",
                table: "FunRetroCheckinResponses",
                columns: new[] { "QuestionId", "MemberId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FunRetroCheckinResponses");

            migrationBuilder.DropTable(
                name: "FunRetroCheckinQuestions");

            migrationBuilder.DropColumn(
                name: "CheckinEnabled",
                table: "FunRetroSessions");
        }
    }
}
