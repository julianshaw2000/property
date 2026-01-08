using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class DashboardService
{
    private readonly MaintainUkDbContext _context;
    private readonly IMemoryCache _cache;

    private const string StatsKey = "Dashboard_Stats";
    private const string GrowthDataKeyPrefix = "Dashboard_Growth_";
    private const string ActivityFeedKey = "Dashboard_Activity";

    public DashboardService(MaintainUkDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    /// <summary>
    /// Get platform-wide statistics for SuperAdmin dashboard
    /// Cached for 5 minutes for performance
    /// </summary>
    public async Task<DashboardStats> GetDashboardStatsAsync()
    {
        // Try to get from cache first
        if (_cache.TryGetValue(StatsKey, out DashboardStats? cachedStats) && cachedStats != null)
        {
            return cachedStats;
        }

        // All queries bypass org filters for platform-wide view
        var totalOrgs = await _context.Organisations
            .IgnoreQueryFilters()
            .CountAsync();

        var activeOrgs = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.Status == OrganisationStatus.Active)
            .CountAsync();

        var suspendedOrgs = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.Status == OrganisationStatus.Suspended)
            .CountAsync();

        var totalUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync();

        var activeUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.IsActive)
            .CountAsync();

        var usersByRole = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.IsActive)
            .GroupBy(u => u.Role)
            .Select(g => new { Role = g.Key.ToString(), Count = g.Count() })
            .ToListAsync();

        var orgsByPlan = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.Status == OrganisationStatus.Active)
            .GroupBy(o => o.Plan)
            .Select(g => new { Plan = g.Key.ToString(), Count = g.Count() })
            .ToListAsync();

        // Get growth data (last 30 days)
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var recentOrgs = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.CreatedAt >= thirtyDaysAgo)
            .CountAsync();

        var recentUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.CreatedAt >= thirtyDaysAgo)
            .CountAsync();

        // Calculate growth percentages (compare to previous 30 days)
        var sixtyDaysAgo = DateTime.UtcNow.AddDays(-60);
        var previousPeriodOrgs = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.CreatedAt >= sixtyDaysAgo && o.CreatedAt < thirtyDaysAgo)
            .CountAsync();

        var previousPeriodUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.CreatedAt >= sixtyDaysAgo && u.CreatedAt < thirtyDaysAgo)
            .CountAsync();

        var orgGrowthPercent = CalculateGrowthPercentage(previousPeriodOrgs, recentOrgs);
        var userGrowthPercent = CalculateGrowthPercentage(previousPeriodUsers, recentUsers);

        var stats = new DashboardStats
        {
            TotalOrganisations = totalOrgs,
            ActiveOrganisations = activeOrgs,
            SuspendedOrganisations = suspendedOrgs,
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            OrganisationGrowthPercent = orgGrowthPercent,
            UserGrowthPercent = userGrowthPercent,
            UsersByRole = usersByRole.ToDictionary(x => x.Role, x => x.Count),
            OrganisationsByPlan = orgsByPlan.ToDictionary(x => x.Plan, x => x.Count)
        };

        // Cache for 5 minutes
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(5));
        _cache.Set(StatsKey, stats, cacheOptions);

        return stats;
    }

    /// <summary>
    /// Get historical growth data for charts
    /// Cached for 10 minutes for performance
    /// </summary>
    public async Task<List<GrowthDataPoint>> GetGrowthDataAsync(int days = 30)
    {
        // Try to get from cache first
        var cacheKey = $"{GrowthDataKeyPrefix}{days}";
        if (_cache.TryGetValue(cacheKey, out List<GrowthDataPoint>? cachedData) && cachedData != null)
        {
            return cachedData;
        }

        var startDate = DateTime.UtcNow.AddDays(-days).Date;
        var growthData = new List<GrowthDataPoint>();

        // Get daily organisation signups
        var orgSignups = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.CreatedAt >= startDate)
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        // Get daily user registrations
        var userSignups = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.CreatedAt >= startDate)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        // Create daily data points
        for (var date = startDate; date <= DateTime.UtcNow.Date; date = date.AddDays(1))
        {
            var orgCount = orgSignups.FirstOrDefault(x => x.Date == date)?.Count ?? 0;
            var userCount = userSignups.FirstOrDefault(x => x.Date == date)?.Count ?? 0;

            growthData.Add(new GrowthDataPoint
            {
                Date = date,
                OrganisationSignups = orgCount,
                UserRegistrations = userCount
            });
        }

        // Cache for 10 minutes (historical data changes less frequently)
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));
        _cache.Set(cacheKey, growthData, cacheOptions);

        return growthData;
    }

    /// <summary>
    /// Get recent activity feed
    /// Cached for 2 minutes for near real-time updates
    /// </summary>
    public async Task<List<ActivityItem>> GetRecentActivityAsync(int limit = 20)
    {
        // Try to get from cache first
        if (_cache.TryGetValue(ActivityFeedKey, out List<ActivityItem>? cachedActivities) && cachedActivities != null)
        {
            return cachedActivities;
        }

        var activities = new List<ActivityItem>();

        // Get recent organisations (last 7 days)
        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var recentOrgs = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.CreatedAt >= sevenDaysAgo)
            .OrderByDescending(o => o.CreatedAt)
            .Take(limit)
            .Select(o => new ActivityItem
            {
                Type = "organisation.created",
                Description = $"New organisation: {o.Name}",
                Timestamp = o.CreatedAt,
                EntityId = o.Id.ToString(),
                Metadata = new Dictionary<string, string>
                {
                    { "orgName", o.Name },
                    { "plan", o.Plan.ToString() }
                }
            })
            .ToListAsync();

        activities.AddRange(recentOrgs);

        // Get recent audit logs for high-impact events
        var recentAudits = await _context.AuditLogs
            .IgnoreQueryFilters()
            .Where(a => a.CreatedAt >= sevenDaysAgo &&
                       (a.Action == "organisation.suspended" ||
                        a.Action == "organisation.reactivated" ||
                        a.Action == "organisation.primary_admin_changed"))
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new ActivityItem
            {
                Type = a.Action,
                Description = GetActivityDescription(a.Action, a.ChangesSummaryJson),
                Timestamp = a.CreatedAt,
                EntityId = a.EntityId.ToString(),
                Metadata = new Dictionary<string, string>()
            })
            .ToListAsync();

        activities.AddRange(recentAudits);

        // Sort by timestamp and return top results
        var sortedActivities = activities
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToList();

        // Cache for 2 minutes (activity feed should be relatively fresh)
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(2));
        _cache.Set(ActivityFeedKey, sortedActivities, cacheOptions);

        return sortedActivities;
    }

    private static double CalculateGrowthPercentage(int previous, int current)
    {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return Math.Round(((double)(current - previous) / previous) * 100, 1);
    }

    private static string GetActivityDescription(string action, string? changes)
    {
        return action switch
        {
            "organisation.suspended" => "Organisation suspended",
            "organisation.reactivated" => "Organisation reactivated",
            "organisation.primary_admin_changed" => "Primary admin changed",
            _ => action
        };
    }
}

public class DashboardStats
{
    public int TotalOrganisations { get; set; }
    public int ActiveOrganisations { get; set; }
    public int SuspendedOrganisations { get; set; }
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public double OrganisationGrowthPercent { get; set; }
    public double UserGrowthPercent { get; set; }
    public Dictionary<string, int> UsersByRole { get; set; } = new();
    public Dictionary<string, int> OrganisationsByPlan { get; set; } = new();
}

public class GrowthDataPoint
{
    public DateTime Date { get; set; }
    public int OrganisationSignups { get; set; }
    public int UserRegistrations { get; set; }
}

public class ActivityItem
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string EntityId { get; set; } = string.Empty;
    public Dictionary<string, string> Metadata { get; set; } = new();
}
