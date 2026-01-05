using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Quote submitted by contractor for work order
/// </summary>
public class Quote : BaseEntity
{
    public Guid WorkOrderId { get; set; }
    public string QuoteNumber { get; set; } = string.Empty;
    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;
    public Guid SubmittedByUserId { get; set; }
    public decimal SubtotalGBP { get; set; }
    public decimal VatGBP { get; set; }
    public decimal TotalGBP { get; set; }
    public string? LineItemsJson { get; set; } // JSON array of {description, qty, unitPrice, total}
    public string? Notes { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime? ExpiresAt { get; set; }

    // Navigation
    public WorkOrder WorkOrder { get; set; } = null!;
    public User SubmittedByUser { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
}

