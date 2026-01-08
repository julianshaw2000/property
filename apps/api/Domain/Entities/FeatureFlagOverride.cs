namespace MaintainUk.Api.Domain.Entities;

public class FeatureFlagOverride
{
    public Guid Id { get; set; }
    public Guid FlagId { get; set; }
    public Guid OrgId { get; set; }
    public string Value { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public FeatureFlag Flag { get; set; } = null!;
    public Organisation Organisation { get; set; } = null!;
}
