using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Audit log for all mutations (security, compliance)
/// </summary>
public class AuditLog : BaseEntity
{
    public Guid UserId { get; set; }
    public string Action { get; set; } = string.Empty; // "ticket.created", "invoice.approved", etc
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? ChangesSummaryJson { get; set; } // JSON of {field, oldValue, newValue}
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}

