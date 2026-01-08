namespace MaintainUk.Api.Domain.Entities;

public class Webhook
{
    public Guid Id { get; set; }
    public Guid OrgId { get; set; }
    public string Url { get; set; } = null!;
    public string[] Events { get; set; } = Array.Empty<string>(); // Array of event types to subscribe to
    public string Secret { get; set; } = null!; // For HMAC signature verification
    public bool IsActive { get; set; } = true;
    public DateTime? LastSuccessAt { get; set; }
    public DateTime? LastFailureAt { get; set; }
    public int FailureCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation property
    public Organisation Organisation { get; set; } = null!;
}
