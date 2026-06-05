using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeamManager.Api.Migrations
{
    public partial class AddMissingTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add columns that exist in prod but have no migration in the dev lineage
            migrationBuilder.Sql(@"
                ALTER TABLE ""MemberTimesheetConfigs""
                    ADD COLUMN IF NOT EXISTS ""BillableProjectsJson"" text NOT NULL DEFAULT '[]',
                    ADD COLUMN IF NOT EXISTS ""WorkWeekJson"" text NOT NULL DEFAULT '{}',
                    ADD COLUMN IF NOT EXISTS ""MergeEntriesEnabled"" boolean NOT NULL DEFAULT false,
                    ADD COLUMN IF NOT EXISTS ""LocationIconsJson"" text NOT NULL DEFAULT '{}';
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""FeaturePermissions"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid(),
                    ""FeatureKey"" character varying(50) NOT NULL,
                    ""Category"" character varying(50) NOT NULL,
                    ""Label"" character varying(100) NOT NULL,
                    ""Role"" character varying(20) NOT NULL,
                    ""IsEnabled"" boolean NOT NULL,
                    CONSTRAINT ""PK_FeaturePermissions"" PRIMARY KEY (""Id"")
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_FeaturePermission_FeatureKey_Role""
                    ON ""FeaturePermissions"" (""FeatureKey"", ""Role"");

                CREATE TABLE IF NOT EXISTS ""MemberFeatureOverrides"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid(),
                    ""TeamMemberId"" uuid NOT NULL,
                    ""FeatureKey"" character varying(50) NOT NULL,
                    ""IsEnabled"" boolean NOT NULL,
                    CONSTRAINT ""PK_MemberFeatureOverrides"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_MemberFeatureOverrides_TeamMembers_TeamMemberId""
                        FOREIGN KEY (""TeamMemberId"") REFERENCES ""TeamMembers""(""Id"") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_MemberFeatureOverride_MemberId_FeatureKey""
                    ON ""MemberFeatureOverrides"" (""TeamMemberId"", ""FeatureKey"");

                CREATE TABLE IF NOT EXISTS ""TimesheetWebhooks"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid(),
                    ""Name"" character varying(200) NOT NULL,
                    ""Url"" text NOT NULL,
                    ""Method"" character varying(10) NOT NULL DEFAULT 'POST',
                    ""HeadersJson"" text NOT NULL DEFAULT '{}',
                    ""BodyTemplate"" text NOT NULL DEFAULT '',
                    ""OnCreate"" boolean NOT NULL DEFAULT true,
                    ""OnUpdate"" boolean NOT NULL DEFAULT true,
                    ""OnDelete"" boolean NOT NULL DEFAULT true,
                    ""Enabled"" boolean NOT NULL DEFAULT true,
                    ""MaxRetries"" integer NOT NULL DEFAULT 3,
                    ""StoredCookie"" text,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_TimesheetWebhooks"" PRIMARY KEY (""Id"")
                );

                CREATE TABLE IF NOT EXISTS ""TimesheetWebhookDeliveries"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid(),
                    ""WebhookId"" uuid NOT NULL,
                    ""EventType"" character varying(20) NOT NULL,
                    ""PayloadJson"" text NOT NULL,
                    ""Status"" character varying(20) NOT NULL DEFAULT 'pending',
                    ""AttemptCount"" integer NOT NULL DEFAULT 0,
                    ""NextAttemptAt"" timestamp with time zone,
                    ""LastStatusCode"" integer,
                    ""LastError"" text,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""DeliveredAt"" timestamp with time zone,
                    CONSTRAINT ""PK_TimesheetWebhookDeliveries"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_TimesheetWebhookDeliveries_TimesheetWebhooks_WebhookId""
                        FOREIGN KEY (""WebhookId"") REFERENCES ""TimesheetWebhooks""(""Id"") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS ""IX_TimesheetWebhookDeliveries_Status_NextAttemptAt""
                    ON ""TimesheetWebhookDeliveries"" (""Status"", ""NextAttemptAt"");
                CREATE INDEX IF NOT EXISTS ""IX_TimesheetWebhookDeliveries_WebhookId""
                    ON ""TimesheetWebhookDeliveries"" (""WebhookId"");
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS ""TimesheetWebhookDeliveries"";
                DROP TABLE IF EXISTS ""TimesheetWebhooks"";
                DROP TABLE IF EXISTS ""MemberFeatureOverrides"";
                DROP TABLE IF EXISTS ""FeaturePermissions"";
            ");
        }
    }
}
