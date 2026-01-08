using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// User entity - staff, contractors, tenants
/// </summary>
public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneE164 { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    // MFA fields
    public bool MfaEnabled { get; set; }
    public string? MfaSecret { get; set; }

    // Navigation
    public Organisation Organisation { get; set; } = null!;
}

