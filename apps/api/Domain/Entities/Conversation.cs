using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Conversation thread (ticket-scoped, or standalone)
/// </summary>
public class Conversation : BaseEntity
{
    public Guid? TicketId { get; set; }
    public string? Subject { get; set; }
    public bool IsArchived { get; set; }

    // Navigation
    public MaintenanceTicket? Ticket { get; set; }
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

