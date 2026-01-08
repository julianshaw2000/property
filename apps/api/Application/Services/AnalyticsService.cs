using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class AnalyticsService
{
    private readonly MaintainUkDbContext _context;
    private readonly IMemoryCache _cache;

    private const string UsageStatsKey = "Analytics_UsageStats";

    public AnalyticsService(MaintainUkDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    /// <summary>
    /// Get usage statistics for all organisations
    /// Cached for 10 minutes
    /// </summary>
    public async Task<List<OrganisationUsage>> GetUsageStatsAsync()
    {
        // Try to get from cache first
        if (_cache.TryGetValue(UsageStatsKey, out List<OrganisationUsage>? cachedStats) && cachedStats != null)
        {
            return cachedStats;
        }

        var organisations = await _context.Organisations
            .IgnoreQueryFilters()
            .OrderBy(o => o.Name)
            .ToListAsync();

        var usageStats = new List<OrganisationUsage>();

        foreach (var org in organisations)
        {
            // Count tickets for this org
            var ticketCount = await _context.MaintenanceTickets
                .IgnoreQueryFilters()
                .Where(t => t.OrgId == org.Id)
                .CountAsync();

            // Count work orders
            var workOrderCount = await _context.WorkOrders
                .IgnoreQueryFilters()
                .Where(w => w.OrgId == org.Id)
                .CountAsync();

            // Count users
            var userCount = await _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.OrgId == org.Id && u.IsActive)
                .CountAsync();

            // Get subscription plan details
            var plan = await _context.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Id == org.PlanId);

            usageStats.Add(new OrganisationUsage
            {
                OrganisationId = org.Id,
                OrganisationName = org.Name,
                Plan = org.Plan.ToString(),
                Status = org.Status.ToString(),
                TicketCount = ticketCount,
                WorkOrderCount = workOrderCount,
                UserCount = userCount,
                MaxUsers = plan?.MaxUsers ?? 0,
                MaxTickets = plan?.MaxTickets ?? 0,
                StorageUsedGb = 0, // TODO: Calculate from file attachments
                MaxStorageGb = plan?.MaxStorageGb ?? 0,
                ApiCallCount = 0, // TODO: Track API calls
                MaxApiCalls = plan?.MaxApiCalls ?? 0,
                CreatedAt = org.CreatedAt,
                LastActivityAt = org.LastActivityAt
            });
        }

        // Cache for 10 minutes
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));
        _cache.Set(UsageStatsKey, usageStats, cacheOptions);

        return usageStats;
    }

    /// <summary>
    /// Get top organisations by a specific metric
    /// </summary>
    public async Task<List<TopOrganisation>> GetTopOrganisationsAsync(string metric, int limit = 10)
    {
        var usageStats = await GetUsageStatsAsync();

        var topOrgs = metric.ToLower() switch
        {
            "tickets" => usageStats.OrderByDescending(o => o.TicketCount).Take(limit),
            "workorders" => usageStats.OrderByDescending(o => o.WorkOrderCount).Take(limit),
            "users" => usageStats.OrderByDescending(o => o.UserCount).Take(limit),
            _ => usageStats.OrderByDescending(o => o.TicketCount).Take(limit)
        };

        return topOrgs.Select(o => new TopOrganisation
        {
            OrganisationId = o.OrganisationId,
            OrganisationName = o.OrganisationName,
            Plan = o.Plan,
            MetricName = metric,
            MetricValue = metric.ToLower() switch
            {
                "tickets" => o.TicketCount,
                "workorders" => o.WorkOrderCount,
                "users" => o.UserCount,
                _ => o.TicketCount
            }
        }).ToList();
    }

    /// <summary>
    /// Get organisations exceeding their plan limits
    /// </summary>
    public async Task<List<OrganisationUsage>> GetOrganisationsExceedingLimitsAsync()
    {
        var usageStats = await GetUsageStatsAsync();

        return usageStats.Where(o =>
            (o.MaxUsers > 0 && o.UserCount > o.MaxUsers) ||
            (o.MaxTickets > 0 && o.TicketCount > o.MaxTickets) ||
            (o.MaxStorageGb > 0 && o.StorageUsedGb > o.MaxStorageGb)
        ).ToList();
    }
}

public class OrganisationUsage
{
    public Guid OrganisationId { get; set; }
    public string OrganisationName { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TicketCount { get; set; }
    public int WorkOrderCount { get; set; }
    public int UserCount { get; set; }
    public int MaxUsers { get; set; }
    public int MaxTickets { get; set; }
    public long StorageUsedGb { get; set; }
    public long MaxStorageGb { get; set; }
    public int ApiCallCount { get; set; }
    public int MaxApiCalls { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
}

public class TopOrganisation
{
    public Guid OrganisationId { get; set; }
    public string OrganisationName { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string MetricName { get; set; } = string.Empty;
    public int MetricValue { get; set; }
}
