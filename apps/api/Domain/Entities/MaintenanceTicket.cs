using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Maintenance ticket entity
/// </summary>
public class MaintenanceTicket : BaseEntity
{
    public string TicketNumber { get; set; } = string.Empty;
    public Guid UnitId { get; set; }
    public Guid? ReportedByContactId { get; set; }
    public TicketCategory Category { get; set; }
    public TicketPriority Priority { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.NEW;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ReportedByName { get; set; }
    public string? ReportedByPhone { get; set; }
    public string? ReportedByEmail { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? ResolutionNotes { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    // Navigation
    public Unit Unit { get; set; } = null!;
    public User? AssignedToUser { get; set; }
    public ICollection<TicketTimelineEvent> TimelineEvents { get; set; } = new List<TicketTimelineEvent>();
}

