namespace MaintainUk.Api.Domain.Common;

/// <summary>
/// Base entity with ID, timestamps, and org scoping
/// </summary>
public abstract class BaseEntity : IHasOrgId, IHasTimestamps
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrgId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

