using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Invoice submitted by contractor for completed work
/// </summary>
public class Invoice : BaseEntity
{
    public Guid WorkOrderId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public Guid SubmittedByUserId { get; set; }
    public decimal SubtotalGBP { get; set; }
    public decimal VatGBP { get; set; }
    public decimal TotalGBP { get; set; }
    public string? LineItemsJson { get; set; } // JSON array of {description, qty, unitPrice, total}
    public string? FileKey { get; set; } // S3 key for uploaded invoice PDF
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public WorkOrder WorkOrder { get; set; } = null!;
    public User SubmittedByUser { get; set; } = null!;
    public User? ApprovedByUser { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

