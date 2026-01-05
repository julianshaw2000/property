using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Refresh token for JWT token rotation
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}

