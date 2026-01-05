namespace MaintainUk.Api.Domain.Common;

/// <summary>
/// Interface for entities with timestamp tracking
/// </summary>
public interface IHasTimestamps
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}

