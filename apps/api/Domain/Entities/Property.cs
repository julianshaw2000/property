using MaintainUk.Api.Domain.Common;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Property entity
/// </summary>
public class Property : BaseEntity
{
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string Postcode { get; set; } = string.Empty;
    public string Country { get; set; } = "GB";
    public string PropertyType { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";

    // Navigation
    public Organisation Organisation { get; set; } = null!;
    public ICollection<Unit> Units { get; set; } = new List<Unit>();
}

