using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Contracts.Tickets;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class TicketService
{
    private readonly MaintainUkDbContext _context;

    public TicketService(MaintainUkDbContext context)
    {
        _context = context;
    }

    public async Task<TicketDetailResponse> CreateTicketAsync(CreateTicketRequest request, Guid orgId)
    {
        // Validate unit exists and belongs to org
        var unit = await _context.Units
            .Include(u => u.Property)
            .FirstOrDefaultAsync(u => u.Id == request.UnitId && u.OrgId == orgId);

        if (unit == null)
        {
            throw new InvalidOperationException("Unit not found");
        }

        // Generate ticket number
        var count = await _context.MaintenanceTickets
            .Where(t => t.OrgId == orgId)
            .CountAsync();
        var ticketNumber = $"TKT-{DateTime.UtcNow.Year}-{(count + 1):D5}";

        var ticket = new MaintenanceTicket
        {
            OrgId = orgId,
            UnitId = request.UnitId,
            TicketNumber = ticketNumber,
            Category = request.Category,
            Priority = request.Priority,
            Status = TicketStatus.Open,
            Title = request.Title,
            Description = request.Description,
            ReportedByName = request.ReportedByName,
            ReportedByPhone = request.ReportedByPhone,
            ReportedByEmail = request.ReportedByEmail
        };

        _context.MaintenanceTickets.Add(ticket);

        // Add timeline event
        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = ticket.Id,
            EventType = "ticket.created",
            Description = $"Ticket created: {ticket.Title}"
        };

        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        // Ticket was just created for this org, so detail lookup should not be null
        return (await GetTicketDetailAsync(ticket.Id, orgId))!;
    }

    public async Task<TicketDetailResponse?> GetTicketDetailAsync(Guid ticketId, Guid orgId)
    {
        var ticket = await _context.MaintenanceTickets
            .Include(t => t.Unit)
                .ThenInclude(u => u.Property)
            .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrgId == orgId);

        if (ticket == null)
        {
            return null;
        }

        var timeline = await _context.TicketTimelineEvents
            .Where(e => e.TicketId == ticketId)
            .OrderBy(e => e.CreatedAt)
            .Select(e => new TimelineEventResponse(
                e.Id,
                e.EventType,
                e.Description,
                e.ActorUserId,
                null, // TODO: Load actor name
                e.CreatedAt
            ))
            .ToListAsync();

        return new TicketDetailResponse(
            ticket.Id,
            ticket.TicketNumber,
            ticket.OrgId,
            ticket.UnitId,
            ticket.Unit.Name ?? $"Unit {ticket.Unit.Number}",
            $"{ticket.Unit.Property.AddressLine1}, {ticket.Unit.Property.City}",
            ticket.Category,
            ticket.Priority,
            ticket.Status,
            ticket.Title,
            ticket.Description,
            ticket.ReportedByName,
            ticket.ReportedByPhone,
            ticket.ReportedByEmail,
            ticket.AssignedToUserId,
            null, // TODO: Load assigned user name
            ticket.ResolutionNotes,
            ticket.ResolvedAt,
            ticket.CreatedAt,
            ticket.UpdatedAt,
            timeline
        );
    }

    public async Task<List<TicketResponse>> ListTicketsAsync(
        Guid orgId,
        TicketStatus? status = null,
        TicketPriority? priority = null,
        int skip = 0,
        int take = 50)
    {
        var query = _context.MaintenanceTickets
            .Include(t => t.Unit)
                .ThenInclude(u => u.Property)
            .Where(t => t.OrgId == orgId);

        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        if (priority.HasValue)
        {
            query = query.Where(t => t.Priority == priority.Value);
        }

        var tickets = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(t => new TicketResponse(
                t.Id,
                t.TicketNumber,
                t.OrgId,
                t.UnitId,
                t.Unit.Name ?? $"Unit {t.Unit.Number}",
                $"{t.Unit.Property.AddressLine1}, {t.Unit.Property.City}",
                t.Category,
                t.Priority,
                t.Status,
                t.Title,
                t.Description,
                t.ReportedByName,
                t.AssignedToUserId,
                null, // TODO: Load assigned user name
                t.ResolvedAt,
                t.CreatedAt,
                t.UpdatedAt
            ))
            .ToListAsync();

        return tickets;
    }

    public async Task<TicketDetailResponse?> UpdateTicketAsync(
        Guid ticketId,
        UpdateTicketRequest request,
        Guid orgId,
        Guid userId)
    {
        var ticket = await _context.MaintenanceTickets
            .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrgId == orgId);

        if (ticket == null)
        {
            return null;
        }

        var changes = new List<string>();

        if (request.Status.HasValue && ticket.Status != request.Status.Value)
        {
            var oldStatus = ticket.Status;
            ticket.Status = request.Status.Value;
            changes.Add($"Status changed from {oldStatus} to {ticket.Status}");

            if (ticket.Status == TicketStatus.Resolved || ticket.Status == TicketStatus.CLOSED)
            {
                ticket.ResolvedAt = DateTime.UtcNow;
            }
        }

        if (request.Priority.HasValue && ticket.Priority != request.Priority.Value)
        {
            var oldPriority = ticket.Priority;
            ticket.Priority = request.Priority.Value;
            changes.Add($"Priority changed from {oldPriority} to {ticket.Priority}");
        }

        if (request.AssignedToUserId.HasValue && ticket.AssignedToUserId != request.AssignedToUserId.Value)
        {
            ticket.AssignedToUserId = request.AssignedToUserId.Value;
            changes.Add($"Assigned to user {request.AssignedToUserId.Value}");
        }

        if (!string.IsNullOrEmpty(request.ResolutionNotes))
        {
            ticket.ResolutionNotes = request.ResolutionNotes;
        }

        // Add timeline event for each change
        foreach (var change in changes)
        {
            var timelineEvent = new TicketTimelineEvent
            {
                OrgId = orgId,
                TicketId = ticket.Id,
                EventType = "ticket.updated",
                Description = change,
                ActorUserId = userId
            };
            _context.TicketTimelineEvents.Add(timelineEvent);
        }

        await _context.SaveChangesAsync();

        return await GetTicketDetailAsync(ticket.Id, orgId);
    }

    public async Task<bool> DeleteTicketAsync(Guid ticketId, Guid orgId)
    {
        var ticket = await _context.MaintenanceTickets
            .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrgId == orgId);

        if (ticket == null)
        {
            return false;
        }

        _context.MaintenanceTickets.Remove(ticket);
        await _context.SaveChangesAsync();
        return true;
    }
}

