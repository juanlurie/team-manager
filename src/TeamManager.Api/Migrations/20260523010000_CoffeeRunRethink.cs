using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class CoffeeRunRethink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── CoffeeRun: new columns ──
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "CoffeeRuns",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "CoffeeRuns",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "CoffeeRuns",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "OrderDeadline",
                table: "CoffeeRuns",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CancelledAt",
                table: "CoffeeRuns",
                type: "timestamp with time zone",
                nullable: true);

            // ── CoffeeRun: indexes ──
            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRun_CreatedAt",
                table: "CoffeeRuns",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRun_Status",
                table: "CoffeeRuns",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CoffeeRun_InitiatorId",
                table: "CoffeeRuns",
                column: "InitiatorId");

            // ── CoffeeRunMenuItem: new columns ──
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "CoffeeRunMenuItems",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxQuantity",
                table: "CoffeeRunMenuItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAvailable",
                table: "CoffeeRunMenuItems",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "CoffeeRunMenuItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "CoffeeRunMenuItems",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            // ── CoffeeRunOrder: new columns ──
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "CoffeeRunOrders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Placed");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                table: "CoffeeRunOrders",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "CoffeeRunOrders",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            // ── CoffeeRunOrderItem: new columns ──
            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "CoffeeRunOrderItems",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LineTotal",
                table: "CoffeeRunOrderItems",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            // ── Backfill: snapshot prices for existing order items ──
            migrationBuilder.Sql(@"
                UPDATE ""CoffeeRunOrderItems"" AS oi
                SET ""UnitPrice"" = mi.""Price"",
                    ""LineTotal"" = mi.""Price"" * oi.""Quantity""
                FROM ""CoffeeRunMenuItems"" AS mi
                WHERE oi.""CoffeeRunMenuItemId"" = mi.""Id""
                  AND (oi.""UnitPrice"" = 0 OR oi.""UnitPrice"" IS NULL);
            ");

            // ── Backfill: compute TotalAmount for existing orders ──
            migrationBuilder.Sql(@"
                UPDATE ""CoffeeRunOrders"" AS o
                SET ""TotalAmount"" = sub.total,
                    ""UpdatedAt"" = o.""CreatedAt""
                FROM (
                    SELECT oi.""CoffeeRunOrderId"", SUM(oi.""LineTotal"") AS total
                    FROM ""CoffeeRunOrderItems"" AS oi
                    GROUP BY oi.""CoffeeRunOrderId""
                ) AS sub
                WHERE o.""Id"" = sub.""CoffeeRunOrderId""
                  AND (o.""TotalAmount"" = 0 OR o.""TotalAmount"" IS NULL);
            ");

            // ── CoffeeRunMenuTemplate: new columns ──
            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "CoffeeRunMenuTemplates",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Personal");

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "CoffeeRunMenuTemplates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "CoffeeRunMenuTemplates",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            // ── CoffeeRunMenuTemplate: index ──
            migrationBuilder.CreateIndex(
                name: "IX_Menu_Template_Scope_Archived",
                table: "CoffeeRunMenuTemplates",
                columns: new[] { "Scope", "IsArchived" });

            // ── CoffeeRunMenuTemplateItem: new columns ──
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "CoffeeRunMenuTemplateItems",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "CoffeeRunMenuTemplateItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_CoffeeRun_CreatedAt", table: "CoffeeRuns");
            migrationBuilder.DropIndex(name: "IX_CoffeeRun_Status", table: "CoffeeRuns");
            migrationBuilder.DropIndex(name: "IX_CoffeeRun_InitiatorId", table: "CoffeeRuns");
            migrationBuilder.DropIndex(name: "IX_Menu_Template_Scope_Archived", table: "CoffeeRunMenuTemplates");

            migrationBuilder.DropColumn(name: "Title", table: "CoffeeRuns");
            migrationBuilder.DropColumn(name: "Description", table: "CoffeeRuns");
            migrationBuilder.DropColumn(name: "Location", table: "CoffeeRuns");
            migrationBuilder.DropColumn(name: "OrderDeadline", table: "CoffeeRuns");
            migrationBuilder.DropColumn(name: "CancelledAt", table: "CoffeeRuns");

            migrationBuilder.DropColumn(name: "Category", table: "CoffeeRunMenuItems");
            migrationBuilder.DropColumn(name: "MaxQuantity", table: "CoffeeRunMenuItems");
            migrationBuilder.DropColumn(name: "IsAvailable", table: "CoffeeRunMenuItems");
            migrationBuilder.DropColumn(name: "SortOrder", table: "CoffeeRunMenuItems");

            migrationBuilder.DropColumn(name: "Status", table: "CoffeeRunOrders");
            migrationBuilder.DropColumn(name: "TotalAmount", table: "CoffeeRunOrders");
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "CoffeeRunOrders");

            migrationBuilder.DropColumn(name: "UnitPrice", table: "CoffeeRunOrderItems");
            migrationBuilder.DropColumn(name: "LineTotal", table: "CoffeeRunOrderItems");

            migrationBuilder.DropColumn(name: "Scope", table: "CoffeeRunMenuTemplates");
            migrationBuilder.DropColumn(name: "IsArchived", table: "CoffeeRunMenuTemplates");
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "CoffeeRunMenuTemplates");

            migrationBuilder.DropColumn(name: "Category", table: "CoffeeRunMenuTemplateItems");
            migrationBuilder.DropColumn(name: "SortOrder", table: "CoffeeRunMenuTemplateItems");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "CoffeeRunMenuItems",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150);
        }
    }
}
