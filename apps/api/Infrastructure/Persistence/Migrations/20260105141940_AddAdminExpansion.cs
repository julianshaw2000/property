using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaintainUk.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminExpansion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MfaEnabled",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MfaSecret",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingCycle",
                table: "Organisations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BrandingLogoUrl",
                table: "Organisations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandingPrimaryColor",
                table: "Organisations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityAt",
                table: "Organisations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Locale",
                table: "Organisations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "PlanId",
                table: "Organisations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Timezone",
                table: "Organisations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "TrialEndsAt",
                table: "Organisations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApiKeys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    KeyHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    KeyPreview = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiKeys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApiKeys_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApiKeys_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "FeatureFlags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DefaultValue = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureFlags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Value = table.Column<string>(type: "jsonb", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformSettings", x => x.Key);
                    table.ForeignKey(
                        name: "FK_PlatformSettings_Users_UpdatedBy",
                        column: x => x.UpdatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PriceMonthly = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    PriceAnnually = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    MaxUsers = table.Column<int>(type: "integer", nullable: false),
                    MaxTickets = table.Column<int>(type: "integer", nullable: false),
                    MaxStorageGb = table.Column<int>(type: "integer", nullable: false),
                    MaxApiCalls = table.Column<int>(type: "integer", nullable: false),
                    Features = table.Column<string[]>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Webhooks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Events = table.Column<string[]>(type: "jsonb", nullable: false),
                    Secret = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastSuccessAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastFailureAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FailureCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Webhooks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Webhooks_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FeatureFlagOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FlagId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureFlagOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureFlagOverrides_FeatureFlags_FlagId",
                        column: x => x.FlagId,
                        principalTable: "FeatureFlags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FeatureFlagOverrides_Organisations_OrgId",
                        column: x => x.OrgId,
                        principalTable: "Organisations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Organisations_LastActivityAt",
                table: "Organisations",
                column: "LastActivityAt");

            migrationBuilder.CreateIndex(
                name: "IX_Organisations_PlanId",
                table: "Organisations",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Organisations_Status",
                table: "Organisations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_CreatedBy",
                table: "ApiKeys",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_KeyHash",
                table: "ApiKeys",
                column: "KeyHash");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_OrgId",
                table: "ApiKeys",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_FeatureFlagOverrides_FlagId_OrgId",
                table: "FeatureFlagOverrides",
                columns: new[] { "FlagId", "OrgId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeatureFlagOverrides_OrgId",
                table: "FeatureFlagOverrides",
                column: "OrgId");

            migrationBuilder.CreateIndex(
                name: "IX_FeatureFlags_Key",
                table: "FeatureFlags",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlatformSettings_UpdatedBy",
                table: "PlatformSettings",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPlans_Slug",
                table: "SubscriptionPlans",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Webhooks_OrgId",
                table: "Webhooks",
                column: "OrgId");

            migrationBuilder.AddForeignKey(
                name: "FK_Organisations_SubscriptionPlans_PlanId",
                table: "Organisations",
                column: "PlanId",
                principalTable: "SubscriptionPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Organisations_SubscriptionPlans_PlanId",
                table: "Organisations");

            migrationBuilder.DropTable(
                name: "ApiKeys");

            migrationBuilder.DropTable(
                name: "FeatureFlagOverrides");

            migrationBuilder.DropTable(
                name: "PlatformSettings");

            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropTable(
                name: "Webhooks");

            migrationBuilder.DropTable(
                name: "FeatureFlags");

            migrationBuilder.DropIndex(
                name: "IX_Organisations_LastActivityAt",
                table: "Organisations");

            migrationBuilder.DropIndex(
                name: "IX_Organisations_PlanId",
                table: "Organisations");

            migrationBuilder.DropIndex(
                name: "IX_Organisations_Status",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "MfaEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MfaSecret",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BillingCycle",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "BrandingLogoUrl",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "BrandingPrimaryColor",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "Locale",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "PlanId",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "Timezone",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "TrialEndsAt",
                table: "Organisations");
        }
    }
}
