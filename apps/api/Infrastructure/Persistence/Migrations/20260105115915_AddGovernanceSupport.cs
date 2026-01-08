using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaintainUk.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGovernanceSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PrimaryAdminUserId",
                table: "Organisations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Organisations_PrimaryAdminUserId",
                table: "Organisations",
                column: "PrimaryAdminUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Organisations_Users_PrimaryAdminUserId",
                table: "Organisations",
                column: "PrimaryAdminUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Backfill: Set first OrgAdmin as PrimaryAdmin for each existing org
            migrationBuilder.Sql(@"
                UPDATE ""Organisations"" o
                SET ""PrimaryAdminUserId"" = (
                    SELECT u.""Id""
                    FROM ""Users"" u
                    WHERE u.""OrgId"" = o.""Id""
                      AND u.""Role"" = 'OrgAdmin'
                    ORDER BY u.""CreatedAt""
                    LIMIT 1
                )
                WHERE ""PrimaryAdminUserId"" IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Organisations_Users_PrimaryAdminUserId",
                table: "Organisations");

            migrationBuilder.DropIndex(
                name: "IX_Organisations_PrimaryAdminUserId",
                table: "Organisations");

            migrationBuilder.DropColumn(
                name: "PrimaryAdminUserId",
                table: "Organisations");
        }
    }
}
