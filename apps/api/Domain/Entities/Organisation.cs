using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Multi-tenant root entity
/// </summary>
public class Organisation : IHasTimestamps
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Free;
    public OrganisationStatus Status { get; set; } = OrganisationStatus.Active;
    public string? BillingEmail { get; set; }
    public string? StripeCustomerId { get; set; }
    public string? SubscriptionStatus { get; set; }
    public int SmsLimit { get; set; }
    public int WhatsAppLimit { get; set; }
    public int AiJobLimit { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Property> Properties { get; set; } = new List<Property>();
}

