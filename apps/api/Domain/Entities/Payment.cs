using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Payment record for invoice
/// </summary>
public class Payment : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public decimal AmountGBP { get; set; }
    public PaymentMethod Method { get; set; }
    public DateTime PaidAt { get; set; }
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public Invoice Invoice { get; set; } = null!;
}

