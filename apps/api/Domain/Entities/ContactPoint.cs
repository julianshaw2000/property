using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Contact point for a user (email, phone, SMS, WhatsApp)
/// Links to ConsentRecord for GDPR compliance
/// </summary>
public class ContactPoint : BaseEntity
{
    public Guid UserId { get; set; }
    public ContactPointType Type { get; set; }
    public string Value { get; set; } = string.Empty; // email or E.164 phone
    public bool IsVerified { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime? VerifiedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<ConsentRecord> ConsentRecords { get; set; } = new List<ConsentRecord>();
}

