namespace MaintainUk.Api.Domain.Entities;

public class ApiKey
{
    public Guid Id { get; set; }
    public Guid OrgId { get; set; }
    public string KeyHash { get; set; } = null!; // Bcrypt hash of the actual key
    public string KeyPreview { get; set; } = null!; // First 8 chars for display (e.g., "mk_live_...")
    public string? Name { get; set; } // Optional friendly name
    public DateTime? LastUsedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }

    // Navigation properties
    public Organisation Organisation { get; set; } = null!;
    public User? CreatedByUser { get; set; }
}
