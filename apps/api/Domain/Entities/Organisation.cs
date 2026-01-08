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
    public Domain.Enums.SubscriptionPlan Plan { get; set; } = Domain.Enums.SubscriptionPlan.Free; // Legacy enum field
    public OrganisationStatus Status { get; set; } = OrganisationStatus.Active;
    public string? BillingEmail { get; set; }
    public string? StripeCustomerId { get; set; }
    public string? SubscriptionStatus { get; set; }
    public int SmsLimit { get; set; }
    public int WhatsAppLimit { get; set; }
    public int AiJobLimit { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Primary admin designation
    public Guid? PrimaryAdminUserId { get; set; }

    // New plan relationship (replaces enum in future)
    public Guid? PlanId { get; set; }
    public string BillingCycle { get; set; } = "monthly"; // monthly, annually
    public DateTime? TrialEndsAt { get; set; }
    public DateTime? LastActivityAt { get; set; }

    // Branding
    public string? BrandingLogoUrl { get; set; }
    public string? BrandingPrimaryColor { get; set; }

    // Localization
    public string Timezone { get; set; } = "Europe/London";
    public string Locale { get; set; } = "en-GB";

    // Navigation properties
    public User? PrimaryAdmin { get; set; }
    public Entities.SubscriptionPlan? SubscriptionPlan { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Property> Properties { get; set; } = new List<Property>();
    public ICollection<FeatureFlagOverride> FeatureFlagOverrides { get; set; } = new List<FeatureFlagOverride>();
    public ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();
    public ICollection<Webhook> Webhooks { get; set; } = new List<Webhook>();
}

