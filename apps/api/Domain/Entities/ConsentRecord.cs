using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// GDPR consent record for messaging
/// </summary>
public class ConsentRecord : BaseEntity
{
    public Guid ContactPointId { get; set; }
    public string ConsentType { get; set; } = string.Empty; // "marketing", "transactional", "all"
    public bool IsGranted { get; set; }
    public DateTime GrantedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    // Navigation
    public ContactPoint ContactPoint { get; set; } = null!;
}

