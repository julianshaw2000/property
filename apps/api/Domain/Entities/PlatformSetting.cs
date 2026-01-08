namespace MaintainUk.Api.Domain.Entities;

public class PlatformSetting
{
    public string Key { get; set; } = null!; // Primary key
    public string Value { get; set; } = null!; // JSON value
    public DateTime UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }

    // Navigation property
    public User? UpdatedByUser { get; set; }
}
