using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Timeline event for a ticket
/// </summary>
public class TicketTimelineEvent : BaseEntity
{
    public Guid TicketId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ActorUserId { get; set; }
    public string? DataJson { get; set; }

    // Navigation
    public MaintenanceTicket Ticket { get; set; } = null!;
    public User? ActorUser { get; set; }
}

