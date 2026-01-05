using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Contracts.WorkOrders;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class WorkOrderService
{
    private readonly MaintainUkDbContext _context;

    public WorkOrderService(MaintainUkDbContext context)
    {
        _context = context;
    }

    public async Task<WorkOrderResponse> CreateWorkOrderAsync(CreateWorkOrderRequest request, Guid orgId)
    {
        var ticket = await _context.MaintenanceTickets
            .FirstOrDefaultAsync(t => t.Id == request.TicketId && t.OrgId == orgId);

        if (ticket == null)
        {
            throw new InvalidOperationException("Ticket not found");
        }

        var count = await _context.WorkOrders
            .Where(w => w.OrgId == orgId)
            .CountAsync();
        var workOrderNumber = $"WO-{DateTime.UtcNow.Year}-{(count + 1):D5}";

        var workOrder = new WorkOrder
        {
            OrgId = orgId,
            TicketId = request.TicketId,
            WorkOrderNumber = workOrderNumber,
            Status = WorkOrderStatus.Draft,
            Description = request.Description,
            ScheduledStartDate = request.ScheduledStartDate,
            ScheduledEndDate = request.ScheduledEndDate
        };

        _context.WorkOrders.Add(workOrder);

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = request.TicketId,
            EventType = "workorder.created",
            Description = $"Work order {workOrderNumber} created"
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetWorkOrderAsync(workOrder.Id, orgId);
    }

    public async Task<WorkOrderResponse> GetWorkOrderAsync(Guid id, Guid orgId)
    {
        var workOrder = await _context.WorkOrders
            .Include(w => w.Ticket)
            .Include(w => w.AssignedContractor)
            .FirstOrDefaultAsync(w => w.Id == id && w.OrgId == orgId);

        if (workOrder == null)
        {
            throw new InvalidOperationException("Work order not found");
        }

        return new WorkOrderResponse(
            workOrder.Id,
            workOrder.WorkOrderNumber,
            workOrder.TicketId,
            workOrder.Ticket.TicketNumber,
            workOrder.Status,
            workOrder.Description,
            workOrder.AssignedContractorId,
            workOrder.AssignedContractor?.Email,
            workOrder.ScheduledStartDate,
            workOrder.ScheduledEndDate,
            workOrder.ActualStartDate,
            workOrder.ActualEndDate,
            workOrder.CreatedAt,
            workOrder.UpdatedAt
        );
    }

    public async Task<List<WorkOrderResponse>> ListWorkOrdersAsync(Guid orgId, int skip = 0, int take = 50)
    {
        var workOrders = await _context.WorkOrders
            .Include(w => w.Ticket)
            .Include(w => w.AssignedContractor)
            .Where(w => w.OrgId == orgId)
            .OrderByDescending(w => w.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(w => new WorkOrderResponse(
                w.Id,
                w.WorkOrderNumber,
                w.TicketId,
                w.Ticket.TicketNumber,
                w.Status,
                w.Description,
                w.AssignedContractorId,
                w.AssignedContractor != null ? w.AssignedContractor.Email : null,
                w.ScheduledStartDate,
                w.ScheduledEndDate,
                w.ActualStartDate,
                w.ActualEndDate,
                w.CreatedAt,
                w.UpdatedAt
            ))
            .ToListAsync();

        return workOrders;
    }

    public async Task<WorkOrderResponse?> AssignWorkOrderAsync(Guid id, Guid contractorId, Guid orgId, Guid userId)
    {
        var workOrder = await _context.WorkOrders
            .FirstOrDefaultAsync(w => w.Id == id && w.OrgId == orgId);

        if (workOrder == null)
        {
            return null;
        }

        workOrder.AssignedContractorId = contractorId;
        workOrder.Status = WorkOrderStatus.Assigned;

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = workOrder.TicketId,
            EventType = "workorder.assigned",
            Description = $"Work order assigned to contractor",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetWorkOrderAsync(id, orgId);
    }

    public async Task<WorkOrderResponse?> ScheduleWorkOrderAsync(Guid id, ScheduleWorkOrderRequest request, Guid orgId, Guid userId)
    {
        var workOrder = await _context.WorkOrders
            .FirstOrDefaultAsync(w => w.Id == id && w.OrgId == orgId);

        if (workOrder == null)
        {
            return null;
        }

        workOrder.ScheduledStartDate = request.ScheduledStartDate;
        workOrder.ScheduledEndDate = request.ScheduledEndDate;
        workOrder.Status = WorkOrderStatus.Scheduled;

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = workOrder.TicketId,
            EventType = "workorder.scheduled",
            Description = $"Work order scheduled for {request.ScheduledStartDate:yyyy-MM-dd}",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetWorkOrderAsync(id, orgId);
    }

    public async Task<WorkOrderResponse?> CompleteWorkOrderAsync(Guid id, CompleteWorkOrderRequest request, Guid orgId, Guid userId)
    {
        var workOrder = await _context.WorkOrders
            .FirstOrDefaultAsync(w => w.Id == id && w.OrgId == orgId);

        if (workOrder == null)
        {
            return null;
        }

        workOrder.Status = WorkOrderStatus.Completed;
        workOrder.ActualEndDate = DateTime.UtcNow;
        if (request.Notes != null)
        {
            workOrder.Notes = request.Notes;
        }

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = workOrder.TicketId,
            EventType = "workorder.completed",
            Description = "Work order completed",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetWorkOrderAsync(id, orgId);
    }
}

