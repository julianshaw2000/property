namespace MaintainUk.Api.Domain.Entities;

public class SubscriptionPlan
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public decimal? PriceMonthly { get; set; }
    public decimal? PriceAnnually { get; set; }

    // Plan Limits (0 = unlimited)
    public int MaxUsers { get; set; }
    public int MaxTickets { get; set; }
    public int MaxStorageGb { get; set; }
    public int MaxApiCalls { get; set; }

    // Features as JSON array
    public string[]? Features { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation property
    public ICollection<Organisation> Organisations { get; set; } = new List<Organisation>();
}
