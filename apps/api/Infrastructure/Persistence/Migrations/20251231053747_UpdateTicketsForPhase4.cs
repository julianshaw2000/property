using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaintainUk.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTicketsForPhase4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UnitNumber",
                table: "Units",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Units",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Units",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EventType",
                table: "TicketTimelineEvents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "TicketTimelineEvents",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AssignedToUserId",
                table: "MaintenanceTickets",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportedByEmail",
                table: "MaintenanceTickets",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportedByName",
                table: "MaintenanceTickets",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportedByPhone",
                table: "MaintenanceTickets",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvedAt",
                table: "MaintenanceTickets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TicketTimelineEvents_ActorUserId",
                table: "TicketTimelineEvents",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceTickets_AssignedToUserId",
                table: "MaintenanceTickets",
                column: "AssignedToUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_MaintenanceTickets_Users_AssignedToUserId",
                table: "MaintenanceTickets",
                column: "AssignedToUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TicketTimelineEvents_Users_ActorUserId",
                table: "TicketTimelineEvents",
                column: "ActorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MaintenanceTickets_Users_AssignedToUserId",
                table: "MaintenanceTickets");

            migrationBuilder.DropForeignKey(
                name: "FK_TicketTimelineEvents_Users_ActorUserId",
                table: "TicketTimelineEvents");

            migrationBuilder.DropIndex(
                name: "IX_TicketTimelineEvents_ActorUserId",
                table: "TicketTimelineEvents");

            migrationBuilder.DropIndex(
                name: "IX_MaintenanceTickets_AssignedToUserId",
                table: "MaintenanceTickets");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "TicketTimelineEvents");

            migrationBuilder.DropColumn(
                name: "AssignedToUserId",
                table: "MaintenanceTickets");

            migrationBuilder.DropColumn(
                name: "ReportedByEmail",
                table: "MaintenanceTickets");

            migrationBuilder.DropColumn(
                name: "ReportedByName",
                table: "MaintenanceTickets");

            migrationBuilder.DropColumn(
                name: "ReportedByPhone",
                table: "MaintenanceTickets");

            migrationBuilder.DropColumn(
                name: "ResolvedAt",
                table: "MaintenanceTickets");

            migrationBuilder.AlterColumn<string>(
                name: "UnitNumber",
                table: "Units",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Units",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "EventType",
                table: "TicketTimelineEvents",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);
        }
    }
}
