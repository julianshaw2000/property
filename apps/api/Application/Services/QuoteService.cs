using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Contracts.Quotes;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class QuoteService
{
    private readonly MaintainUkDbContext _context;

    public QuoteService(MaintainUkDbContext context)
    {
        _context = context;
    }

    public async Task<QuoteResponse> CreateQuoteAsync(CreateQuoteRequest request, Guid orgId, Guid userId)
    {
        var workOrder = await _context.WorkOrders
            .FirstOrDefaultAsync(w => w.Id == request.WorkOrderId && w.OrgId == orgId);

        if (workOrder == null)
        {
            throw new InvalidOperationException("Work order not found");
        }

        var count = await _context.Quotes
            .Where(q => q.OrgId == orgId)
            .CountAsync();
        var quoteNumber = $"QT-{DateTime.UtcNow.Year}-{(count + 1):D5}";

        var quote = new Quote
        {
            OrgId = orgId,
            WorkOrderId = request.WorkOrderId,
            QuoteNumber = quoteNumber,
            Status = QuoteStatus.Draft,
            SubmittedByUserId = userId,
            SubtotalGBP = request.SubtotalGBP,
            VatGBP = request.VatGBP,
            TotalGBP = request.TotalGBP,
            LineItemsJson = request.LineItemsJson,
            Notes = request.Notes,
            ExpiresAt = request.ExpiresAt,
            SubmittedAt = DateTime.UtcNow
        };

        _context.Quotes.Add(quote);

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = workOrder.TicketId,
            EventType = "quote.submitted",
            Description = $"Quote {quoteNumber} submitted for £{request.TotalGBP:F2}",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetQuoteAsync(quote.Id, orgId);
    }

    public async Task<QuoteResponse> GetQuoteAsync(Guid id, Guid orgId)
    {
        var quote = await _context.Quotes
            .Include(q => q.WorkOrder)
            .Include(q => q.SubmittedByUser)
            .FirstOrDefaultAsync(q => q.Id == id && q.OrgId == orgId);

        if (quote == null)
        {
            throw new InvalidOperationException("Quote not found");
        }

        return new QuoteResponse(
            quote.Id,
            quote.QuoteNumber,
            quote.WorkOrderId,
            quote.WorkOrder.WorkOrderNumber,
            quote.Status,
            quote.SubtotalGBP,
            quote.VatGBP,
            quote.TotalGBP,
            quote.LineItemsJson,
            quote.SubmittedByUserId,
            quote.SubmittedByUser.Email,
            quote.SubmittedAt,
            quote.ExpiresAt,
            quote.CreatedAt
        );
    }

    public async Task<List<QuoteResponse>> ListQuotesAsync(Guid orgId, int skip = 0, int take = 50)
    {
        var quotes = await _context.Quotes
            .Include(q => q.WorkOrder)
            .Include(q => q.SubmittedByUser)
            .Where(q => q.OrgId == orgId)
            .OrderByDescending(q => q.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(q => new QuoteResponse(
                q.Id,
                q.QuoteNumber,
                q.WorkOrderId,
                q.WorkOrder.WorkOrderNumber,
                q.Status,
                q.SubtotalGBP,
                q.VatGBP,
                q.TotalGBP,
                q.LineItemsJson,
                q.SubmittedByUserId,
                q.SubmittedByUser.Email,
                q.SubmittedAt,
                q.ExpiresAt,
                q.CreatedAt
            ))
            .ToListAsync();

        return quotes;
    }

    public async Task<QuoteResponse?> ApproveQuoteAsync(Guid id, Guid orgId, Guid userId)
    {
        var quote = await _context.Quotes
            .Include(q => q.WorkOrder)
            .FirstOrDefaultAsync(q => q.Id == id && q.OrgId == orgId);

        if (quote == null)
        {
            return null;
        }

        quote.Status = QuoteStatus.Approved;
        quote.ReviewedAt = DateTime.UtcNow;
        quote.ReviewedByUserId = userId;

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = quote.WorkOrder.TicketId,
            EventType = "quote.approved",
            Description = $"Quote {quote.QuoteNumber} approved",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetQuoteAsync(id, orgId);
    }

    public async Task<QuoteResponse?> RejectQuoteAsync(Guid id, string? reason, Guid orgId, Guid userId)
    {
        var quote = await _context.Quotes
            .Include(q => q.WorkOrder)
            .FirstOrDefaultAsync(q => q.Id == id && q.OrgId == orgId);

        if (quote == null)
        {
            return null;
        }

        quote.Status = QuoteStatus.Rejected;
        quote.ReviewedAt = DateTime.UtcNow;
        quote.ReviewedByUserId = userId;
        quote.ReviewNotes = reason;

        var timelineEvent = new TicketTimelineEvent
        {
            OrgId = orgId,
            TicketId = quote.WorkOrder.TicketId,
            EventType = "quote.rejected",
            Description = $"Quote {quote.QuoteNumber} rejected",
            ActorUserId = userId
        };
        _context.TicketTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();

        return await GetQuoteAsync(id, orgId);
    }
}

