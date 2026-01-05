using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// In-app notification for user
/// </summary>
public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty; // "ticket.assigned", "quote.submitted", etc
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}

