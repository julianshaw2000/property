using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Unit within a property (flat, apartment, etc.)
/// </summary>
public class Unit : BaseEntity
{
    public Guid PropertyId { get; set; }
    public string? UnitNumber { get; set; }
    public string? Name { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public decimal? FloorArea { get; set; }
    public string Status { get; set; } = "Available";

    public string Number => UnitNumber ?? "N/A";

    // Navigation
    public Property Property { get; set; } = null!;
    public ICollection<MaintenanceTicket> Tickets { get; set; } = new List<MaintenanceTicket>();
}

