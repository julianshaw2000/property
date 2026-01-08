namespace MaintainUk.Api.Domain.Entities;

public class FeatureFlag
{
    public Guid Id { get; set; }
    public string Key { get; set; } = null!; // snake_case, e.g., "ai_triage"
    public string Name { get; set; } = null!; // Display name
    public string? Description { get; set; }
    public string Type { get; set; } = "boolean"; // boolean, string, number, json
    public string DefaultValue { get; set; } = "false";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation property
    public ICollection<FeatureFlagOverride> Overrides { get; set; } = new List<FeatureFlagOverride>();
}
