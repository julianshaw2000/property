using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Contracts.Invoices;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class InvoiceService
{
    private readonly MaintainUkDbContext _context;

    public InvoiceService(MaintainUkDbContext context)
    {
        _context = context;
    }

    public async Task<InvoiceResponse> CreateInvoiceAsync(CreateInvoiceRequest request, Guid orgId, Guid userId)
    {
        var workOrder = await _context.WorkOrders
            .FirstOrDefaultAsync(w => w.Id == request.WorkOrderId && w.OrgId == orgId);

        if (workOrder == null)
        {
            throw new InvalidOperationException("Work order not found");
        }

        var invoice = new Invoice
        {
            OrgId = orgId,
            WorkOrderId = request.WorkOrderId,
            InvoiceNumber = request.InvoiceNumber,
            Status = InvoiceStatus.Submitted,
            SubmittedByUserId = userId,
            SubtotalGBP = request.SubtotalGBP,
            VatGBP = request.VatGBP,
            TotalGBP = request.TotalGBP,
            LineItemsJson = request.LineItemsJson,
            FileKey = request.FileKey,
            DueDate = request.DueDate,
            Notes = request.Notes,
            SubmittedAt = DateTime.UtcNow
        };

        _context.Invoices.Add(invoice);

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = workOrder.TicketId,
            EventType = "invoice.submitted",
            Description = $"Invoice {request.InvoiceNumber} submitted for £{request.TotalGBP:F2}",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetInvoiceAsync(invoice.Id, orgId);
    }

    public async Task<InvoiceResponse> GetInvoiceAsync(Guid id, Guid orgId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.WorkOrder)
            .Include(i => i.SubmittedByUser)
            .FirstOrDefaultAsync(i => i.Id == id && i.OrgId == orgId);

        if (invoice == null)
        {
            throw new InvalidOperationException("Invoice not found");
        }

        return new InvoiceResponse(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.WorkOrderId,
            invoice.WorkOrder.WorkOrderNumber,
            invoice.Status,
            invoice.SubtotalGBP,
            invoice.VatGBP,
            invoice.TotalGBP,
            invoice.FileKey,
            invoice.SubmittedByUserId,
            invoice.SubmittedByUser.Email,
            invoice.SubmittedAt,
            invoice.DueDate,
            invoice.PaidAt,
            invoice.CreatedAt
        );
    }

    public async Task<List<InvoiceResponse>> ListInvoicesAsync(Guid orgId, int skip = 0, int take = 50)
    {
        var invoices = await _context.Invoices
            .Include(i => i.WorkOrder)
            .Include(i => i.SubmittedByUser)
            .Where(i => i.OrgId == orgId)
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(i => new InvoiceResponse(
                i.Id,
                i.InvoiceNumber,
                i.WorkOrderId,
                i.WorkOrder.WorkOrderNumber,
                i.Status,
                i.SubtotalGBP,
                i.VatGBP,
                i.TotalGBP,
                i.FileKey,
                i.SubmittedByUserId,
                i.SubmittedByUser.Email,
                i.SubmittedAt,
                i.DueDate,
                i.PaidAt,
                i.CreatedAt
            ))
            .ToListAsync();

        return invoices;
    }

    public async Task<InvoiceResponse?> ApproveInvoiceAsync(Guid id, Guid orgId, Guid userId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.WorkOrder)
            .FirstOrDefaultAsync(i => i.Id == id && i.OrgId == orgId);

        if (invoice == null)
        {
            return null;
        }

        invoice.Status = InvoiceStatus.Approved;
        invoice.ApprovedAt = DateTime.UtcNow;
        invoice.ApprovedByUserId = userId;

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = invoice.WorkOrder.TicketId,
            EventType = "invoice.approved",
            Description = $"Invoice {invoice.InvoiceNumber} approved",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetInvoiceAsync(id, orgId);
    }

    public async Task<InvoiceResponse?> MarkPaidAsync(Guid id, Guid orgId, Guid userId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.WorkOrder)
            .FirstOrDefaultAsync(i => i.Id == id && i.OrgId == orgId);

        if (invoice == null)
        {
            return null;
        }

        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidAt = DateTime.UtcNow;

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = invoice.WorkOrder.TicketId,
            EventType = "invoice.paid",
            Description = $"Invoice {invoice.InvoiceNumber} marked as paid",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetInvoiceAsync(id, orgId);
    }
}

