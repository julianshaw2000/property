using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Outbox pattern for reliable message delivery
/// </summary>
public class OutboxMessage : BaseEntity
{
    public string Type { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public DateTime AvailableAt { get; set; } = DateTime.UtcNow;
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public string? CorrelationId { get; set; }
}

