# Admin Expansion - Implementation Details & Code Examples

*This document contains implementation steps and code examples for the Admin Expansion Plan.*
*Read `ADMIN_EXPANSION_PLAN.md` first for the complete specification.*

---

## Implementation Phases Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Database & Backend Foundation | 2 days | Migrations, entities, core services |
| Phase 2: Backend APIs | 3 days | All API endpoints, DTOs, authorization |
| Phase 3: Frontend Foundation | 2 days | Services, routing, layout |
| Phase 4: Super Admin Screens | 5 days | Dashboard, orgs, plans, flags, tools |
| Phase 5: Org Admin Screens | 2 days | Org dashboard, enhanced user management |
| Phase 6: Testing & Polish | 2 days | Unit tests, E2E tests, bug fixes |
| **Total** | **16 days** | **Full admin expansion** |

---

## Code Examples

### 1. Backend: Subscription Plan Service

**File**: `apps/api/Application/Services/SubscriptionPlanService.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class SubscriptionPlanService
{
    private readonly MaintainUkDbContext _context;
    private readonly AuditLogService _auditLog;

    public SubscriptionPlanService(MaintainUkDbContext context, AuditLogService auditLog)
    {
        _context = context;
        _auditLog = auditLog;
    }

    public async Task<List<SubscriptionPlan>> ListPlansAsync(bool includeArchived = false)
    {
        var query = _context.SubscriptionPlans.AsQueryable();

        if (!includeArchived)
        {
            query = query.Where(p => p.IsActive);
        }

        return await query
            .OrderBy(p => p.PriceMonthly)
            .ToListAsync();
    }

    public async Task<SubscriptionPlan?> GetPlanAsync(Guid planId)
    {
        return await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == planId);
    }

    public async Task<SubscriptionPlan> CreatePlanAsync(
        string name,
        string slug,
        string? description,
        decimal? priceMonthly,
        decimal? priceAnnually,
        int maxUsers,
        int maxTickets,
        int maxStorageGb,
        int maxApiCalls,
        string[] features,
        Guid createdByUserId)
    {
        // Validate slug is unique
        var existing = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (existing != null)
        {
            throw new InvalidOperationException($"Plan with slug '{slug}' already exists");
        }

        var plan = new SubscriptionPlan
        {
            Name = name,
            Slug = slug,
            Description = description,
            PriceMonthly = priceMonthly,
            PriceAnnually = priceAnnually,
            MaxUsers = maxUsers,
            MaxTickets = maxTickets,
            MaxStorageGb = maxStorageGb,
            MaxApiCalls = maxApiCalls,
            Features = features,
            IsActive = true
        };

        _context.SubscriptionPlans.Add(plan);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: Guid.Empty, // Platform-level action
            userId: createdByUserId,
            action: "plan.created",
            entityType: "SubscriptionPlan",
            entityId: plan.Id,
            changes: new { Name = plan.Name, Slug = plan.Slug, PriceMonthly = plan.PriceMonthly }
        );

        return plan;
    }

    public async Task<SubscriptionPlan> UpdatePlanAsync(
        Guid planId,
        string name,
        string? description,
        decimal? priceMonthly,
        decimal? priceAnnually,
        int maxUsers,
        int maxTickets,
        int maxStorageGb,
        int maxApiCalls,
        string[] features,
        Guid updatedByUserId)
    {
        var plan = await _context.SubscriptionPlans.FindAsync(planId);
        if (plan == null)
        {
            throw new InvalidOperationException("Plan not found");
        }

        var oldPrice = plan.PriceMonthly;
        var oldFeatures = plan.Features;

        plan.Name = name;
        plan.Description = description;
        plan.PriceMonthly = priceMonthly;
        plan.PriceAnnually = priceAnnually;
        plan.MaxUsers = maxUsers;
        plan.MaxTickets = maxTickets;
        plan.MaxStorageGb = maxStorageGb;
        plan.MaxApiCalls = maxApiCalls;
        plan.Features = features;
        plan.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: Guid.Empty,
            userId: updatedByUserId,
            action: "plan.updated",
            entityType: "SubscriptionPlan",
            entityId: plan.Id,
            changes: new
            {
                OldPrice = oldPrice,
                NewPrice = priceMonthly,
                OldFeatures = oldFeatures,
                NewFeatures = features
            }
        );

        return plan;
    }

    public async Task<bool> ArchivePlanAsync(Guid planId, Guid archivedByUserId)
    {
        var plan = await _context.SubscriptionPlans.FindAsync(planId);
        if (plan == null)
        {
            return false;
        }

        // Check if any organisations are using this plan
        var orgCount = await _context.Organisations
            .Where(o => o.PlanId == planId && o.Status == OrganisationStatus.Active)
            .CountAsync();

        if (orgCount > 0)
        {
            throw new InvalidOperationException(
                $"Cannot archive plan '{plan.Name}' because {orgCount} organisations are currently using it. " +
                "Migrate organisations to a different plan first.");
        }

        plan.IsActive = false;
        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: Guid.Empty,
            userId: archivedByUserId,
            action: "plan.archived",
            entityType: "SubscriptionPlan",
            entityId: plan.Id,
            changes: new { Name = plan.Name }
        );

        return true;
    }

    public async Task<List<Organisation>> GetOrganisationsByPlanAsync(Guid planId)
    {
        return await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.PlanId == planId)
            .OrderBy(o => o.Name)
            .ToListAsync();
    }
}
```

---

### 2. Backend: Feature Flag Service with Override Logic

**File**: `apps/api/Application/Services/FeatureFlagService.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Infrastructure.Persistence;
using System.Text.Json;

namespace MaintainUk.Api.Application.Services;

public class FeatureFlagService
{
    private readonly MaintainUkDbContext _context;
    private readonly AuditLogService _auditLog;

    public FeatureFlagService(MaintainUkDbContext context, AuditLogService auditLog)
    {
        _context = context;
        _auditLog = auditLog;
    }

    public async Task<List<FeatureFlag>> ListFlagsAsync()
    {
        return await _context.FeatureFlags
            .Where(f => f.IsActive)
            .OrderBy(f => f.Name)
            .ToListAsync();
    }

    public async Task<FeatureFlag?> GetFlagAsync(Guid flagId)
    {
        return await _context.FeatureFlags
            .FirstOrDefaultAsync(f => f.Id == flagId);
    }

    public async Task<FeatureFlag?> GetFlagByKeyAsync(string key)
    {
        return await _context.FeatureFlags
            .FirstOrDefaultAsync(f => f.Key == key && f.IsActive);
    }

    public async Task<FeatureFlag> CreateFlagAsync(
        string key,
        string name,
        string? description,
        string type,
        string defaultValue,
        Guid createdByUserId)
    {
        // Validate key format (snake_case)
        if (!System.Text.RegularExpressions.Regex.IsMatch(key, @"^[a-z][a-z0-9_]*$"))
        {
            throw new InvalidOperationException("Flag key must be snake_case (lowercase letters, numbers, underscores)");
        }

        // Check for duplicate key
        var existing = await _context.FeatureFlags
            .FirstOrDefaultAsync(f => f.Key == key);

        if (existing != null)
        {
            throw new InvalidOperationException($"Feature flag with key '{key}' already exists");
        }

        var flag = new FeatureFlag
        {
            Key = key,
            Name = name,
            Description = description,
            Type = type,
            DefaultValue = defaultValue,
            IsActive = true
        };

        _context.FeatureFlags.Add(flag);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: Guid.Empty,
            userId: createdByUserId,
            action: "feature_flag.created",
            entityType: "FeatureFlag",
            entityId: flag.Id,
            changes: new { Key = flag.Key, DefaultValue = defaultValue }
        );

        return flag;
    }

    public async Task<FeatureFlag> UpdateFlagAsync(
        Guid flagId,
        string name,
        string? description,
        string defaultValue,
        Guid updatedByUserId)
    {
        var flag = await _context.FeatureFlags.FindAsync(flagId);
        if (flag == null)
        {
            throw new InvalidOperationException("Feature flag not found");
        }

        var oldDefaultValue = flag.DefaultValue;

        flag.Name = name;
        flag.Description = description;
        flag.DefaultValue = defaultValue;
        flag.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: Guid.Empty,
            userId: updatedByUserId,
            action: "feature_flag.updated",
            entityType: "FeatureFlag",
            entityId: flag.Id,
            changes: new { Key = flag.Key, OldDefaultValue = oldDefaultValue, NewDefaultValue = defaultValue }
        );

        return flag;
    }

    public async Task<bool> DeleteFlagAsync(Guid flagId, Guid deletedByUserId)
    {
        var flag = await _context.FeatureFlags.FindAsync(flagId);
        if (flag == null)
        {
            return false;
        }

        // Check if any overrides exist
        var overrideCount = await _context.FeatureFlagOverrides
            .Where(o => o.FlagId == flagId)
            .CountAsync();

        if (overrideCount > 0)
        {
            throw new InvalidOperationException(
                $"Cannot delete feature flag '{flag.Name}' because {overrideCount} organisations have overrides. " +
                "Remove all overrides first.");
        }

        flag.IsActive = false;
        flag.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: Guid.Empty,
            userId: deletedByUserId,
            action: "feature_flag.deleted",
            entityType: "FeatureFlag",
            entityId: flag.Id,
            changes: new { Key = flag.Key }
        );

        return true;
    }

    public async Task<List<FeatureFlagOverride>> GetOrgOverridesAsync(Guid orgId)
    {
        return await _context.FeatureFlagOverrides
            .Include(o => o.Flag)
            .Where(o => o.OrgId == orgId)
            .ToListAsync();
    }

    public async Task<FeatureFlagOverride> SetOrgOverrideAsync(
        Guid flagId,
        Guid orgId,
        string value,
        Guid setByUserId)
    {
        var flag = await _context.FeatureFlags.FindAsync(flagId);
        if (flag == null)
        {
            throw new InvalidOperationException("Feature flag not found");
        }

        var org = await _context.Organisations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Id == orgId);

        if (org == null)
        {
            throw new InvalidOperationException("Organisation not found");
        }

        var existing = await _context.FeatureFlagOverrides
            .FirstOrDefaultAsync(o => o.FlagId == flagId && o.OrgId == orgId);

        if (existing != null)
        {
            // Update existing override
            var oldValue = existing.Value;
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditLog.LogAsync(
                orgId: orgId,
                userId: setByUserId,
                action: "feature_flag.override_updated",
                entityType: "FeatureFlagOverride",
                entityId: existing.Id,
                changes: new { Key = flag.Key, OldValue = oldValue, NewValue = value }
            );

            return existing;
        }
        else
        {
            // Create new override
            var newOverride = new FeatureFlagOverride
            {
                FlagId = flagId,
                OrgId = orgId,
                Value = value
            };

            _context.FeatureFlagOverrides.Add(newOverride);
            await _context.SaveChangesAsync();

            await _auditLog.LogAsync(
                orgId: orgId,
                userId: setByUserId,
                action: "feature_flag.override_set",
                entityType: "FeatureFlagOverride",
                entityId: newOverride.Id,
                changes: new { Key = flag.Key, Value = value }
            );

            return newOverride;
        }
    }

    public async Task<bool> RemoveOrgOverrideAsync(Guid flagId, Guid orgId, Guid removedByUserId)
    {
        var override_ = await _context.FeatureFlagOverrides
            .Include(o => o.Flag)
            .FirstOrDefaultAsync(o => o.FlagId == flagId && o.OrgId == orgId);

        if (override_ == null)
        {
            return false;
        }

        _context.FeatureFlagOverrides.Remove(override_);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: orgId,
            userId: removedByUserId,
            action: "feature_flag.override_removed",
            entityType: "FeatureFlagOverride",
            entityId: override_.Id,
            changes: new { Key = override_.Flag.Key }
        );

        return true;
    }

    /// <summary>
    /// Evaluates a feature flag for a specific organisation.
    /// Returns the org-specific override if exists, otherwise returns the default value.
    /// </summary>
    public async Task<string> EvaluateFlagForOrgAsync(string key, Guid orgId)
    {
        var flag = await _context.FeatureFlags
            .FirstOrDefaultAsync(f => f.Key == key && f.IsActive);

        if (flag == null)
        {
            throw new InvalidOperationException($"Feature flag '{key}' not found or inactive");
        }

        // Check for org-specific override
        var override_ = await _context.FeatureFlagOverrides
            .FirstOrDefaultAsync(o => o.FlagId == flag.Id && o.OrgId == orgId);

        return override_?.Value ?? flag.DefaultValue;
    }

    /// <summary>
    /// Evaluates a boolean feature flag for a specific organisation.
    /// </summary>
    public async Task<bool> IsEnabledForOrgAsync(string key, Guid orgId)
    {
        var value = await EvaluateFlagForOrgAsync(key, orgId);
        return bool.TryParse(value, out var result) && result;
    }
}
```

---

### 3. Backend: Dashboard Service with Metrics

**File**: `apps/api/Application/Services/DashboardService.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class DashboardService
{
    private readonly MaintainUkDbContext _context;

    public DashboardService(MaintainUkDbContext context)
    {
        _context = context;
    }

    public async Task<SuperAdminMetrics> GetSuperAdminMetricsAsync()
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var lastMonth = now.AddMonths(-1);

        // Organisation counts
        var totalOrgs = await _context.Organisations.CountAsync();
        var activeOrgs = await _context.Organisations
            .Where(o => o.Status == OrganisationStatus.Active)
            .CountAsync();
        var suspendedOrgs = await _context.Organisations
            .Where(o => o.Status == OrganisationStatus.Suspended)
            .CountAsync();
        var trialOrgs = await _context.Organisations
            .Where(o => o.TrialEndsAt != null && o.TrialEndsAt > now)
            .CountAsync();

        // User counts
        var totalUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync();
        var activeUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.IsActive)
            .CountAsync();

        // Ticket counts (last 30 days)
        var activeTickets = await _context.MaintenanceTickets
            .IgnoreQueryFilters()
            .Where(t => t.CreatedAt > thirtyDaysAgo)
            .CountAsync();

        // Growth metrics
        var orgsLastMonth = await _context.Organisations
            .Where(o => o.CreatedAt < lastMonth)
            .CountAsync();
        var orgGrowthPercent = orgsLastMonth > 0
            ? ((totalOrgs - orgsLastMonth) / (double)orgsLastMonth) * 100
            : 0;

        var usersLastMonth = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.CreatedAt < lastMonth)
            .CountAsync();
        var userGrowthPercent = usersLastMonth > 0
            ? ((totalUsers - usersLastMonth) / (double)usersLastMonth) * 100
            : 0;

        return new SuperAdminMetrics
        {
            TotalOrganisations = totalOrgs,
            ActiveOrganisations = activeOrgs,
            SuspendedOrganisations = suspendedOrgs,
            TrialOrganisations = trialOrgs,
            OrganisationGrowthPercent = Math.Round(orgGrowthPercent, 1),

            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            UserGrowthPercent = Math.Round(userGrowthPercent, 1),

            ActiveTicketsLast30Days = activeTickets
        };
    }

    public async Task<OrgAdminMetrics> GetOrgAdminMetricsAsync(Guid orgId)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);

        // User counts
        var totalUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.OrgId == orgId)
            .CountAsync();
        var activeUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.OrgId == orgId && u.IsActive)
            .CountAsync();
        var pendingInvites = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.OrgId == orgId && u.PasswordHash == null)
            .CountAsync();
        var inactiveUsers = totalUsers - activeUsers;

        // Ticket counts
        var openTickets = await _context.MaintenanceTickets
            .Where(t => t.OrgId == orgId && t.Status != TicketStatus.Closed)
            .CountAsync();
        var ticketsThisMonth = await _context.MaintenanceTickets
            .Where(t => t.OrgId == orgId && t.CreatedAt > thirtyDaysAgo)
            .CountAsync();

        // Work order counts
        var workOrdersThisMonth = await _context.WorkOrders
            .Where(w => w.OrgId == orgId && w.CreatedAt > thirtyDaysAgo)
            .CountAsync();

        return new OrgAdminMetrics
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            PendingInvites = pendingInvites,
            InactiveUsers = inactiveUsers,

            OpenTickets = openTickets,
            TicketsThisMonth = ticketsThisMonth,
            WorkOrdersThisMonth = workOrdersThisMonth
        };
    }

    public async Task<List<AlertItem>> GetAlertsAsync()
    {
        var alerts = new List<AlertItem>();
        var now = DateTime.UtcNow;
        var twentyFourHoursAgo = now.AddHours(-24);

        // Check for suspended orgs with open tickets
        var suspendedOrgsWithTickets = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.Status == OrganisationStatus.Suspended)
            .Select(o => new
            {
                o.Id,
                o.Name,
                OpenTickets = _context.MaintenanceTickets
                    .Where(t => t.OrgId == o.Id && t.Status != TicketStatus.Closed)
                    .Count()
            })
            .Where(x => x.OpenTickets > 0)
            .ToListAsync();

        foreach (var org in suspendedOrgsWithTickets)
        {
            alerts.Add(new AlertItem
            {
                Severity = "error",
                Title = $"Suspended organisation with {org.OpenTickets} open tickets",
                Message = $"{org.Name} is suspended but has {org.OpenTickets} unresolved tickets",
                ActionUrl = $"/admin/organisations/{org.Id}"
            });
        }

        // Check for expiring trials
        var expiringTrials = await _context.Organisations
            .IgnoreQueryFilters()
            .Where(o => o.TrialEndsAt != null
                && o.TrialEndsAt > now
                && o.TrialEndsAt < now.AddDays(7))
            .ToListAsync();

        foreach (var org in expiringTrials)
        {
            var daysRemaining = (org.TrialEndsAt!.Value - now).Days;
            alerts.Add(new AlertItem
            {
                Severity = "warning",
                Title = $"Trial expiring in {daysRemaining} days",
                Message = $"{org.Name}'s trial ends on {org.TrialEndsAt:MMM dd}",
                ActionUrl = $"/admin/organisations/{org.Id}"
            });
        }

        return alerts.OrderByDescending(a => a.Severity == "error" ? 1 : 0).ToList();
    }

    public async Task<OrgUsageMetrics> GetOrgUsageAsync(Guid orgId)
    {
        var org = await _context.Organisations
            .IgnoreQueryFilters()
            .Include(o => o.Plan)
            .FirstOrDefaultAsync(o => o.Id == orgId);

        if (org == null || org.Plan == null)
        {
            throw new InvalidOperationException("Organisation or plan not found");
        }

        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);

        // User count
        var userCount = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.OrgId == orgId && u.IsActive)
            .CountAsync();

        // Ticket count (last 30 days)
        var ticketCount = await _context.MaintenanceTickets
            .Where(t => t.OrgId == orgId && t.CreatedAt > thirtyDaysAgo)
            .CountAsync();

        // Storage (sum of attachment sizes - would need actual implementation)
        var storageGb = 0.0; // TODO: Calculate from Attachments table

        // API calls (last 30 days - would need actual tracking)
        var apiCalls = 0; // TODO: Calculate from API usage logs

        return new OrgUsageMetrics
        {
            Users = new UsageItem
            {
                Current = userCount,
                Limit = org.Plan.MaxUsers,
                Percent = org.Plan.MaxUsers > 0 ? (userCount / (double)org.Plan.MaxUsers) * 100 : 0
            },
            Tickets = new UsageItem
            {
                Current = ticketCount,
                Limit = org.Plan.MaxTickets,
                Percent = org.Plan.MaxTickets > 0 ? (ticketCount / (double)org.Plan.MaxTickets) * 100 : 0
            },
            StorageGb = new UsageItem
            {
                Current = (int)storageGb,
                Limit = org.Plan.MaxStorageGb,
                Percent = org.Plan.MaxStorageGb > 0 ? (storageGb / org.Plan.MaxStorageGb) * 100 : 0
            },
            ApiCalls = new UsageItem
            {
                Current = apiCalls,
                Limit = org.Plan.MaxApiCalls,
                Percent = org.Plan.MaxApiCalls > 0 ? (apiCalls / (double)org.Plan.MaxApiCalls) * 100 : 0
            }
        };
    }
}

// Response DTOs
public record SuperAdminMetrics
{
    public int TotalOrganisations { get; init; }
    public int ActiveOrganisations { get; init; }
    public int SuspendedOrganisations { get; init; }
    public int TrialOrganisations { get; init; }
    public double OrganisationGrowthPercent { get; init; }

    public int TotalUsers { get; init; }
    public int ActiveUsers { get; init; }
    public double UserGrowthPercent { get; init; }

    public int ActiveTicketsLast30Days { get; init; }
}

public record OrgAdminMetrics
{
    public int TotalUsers { get; init; }
    public int ActiveUsers { get; init; }
    public int PendingInvites { get; init; }
    public int InactiveUsers { get; init; }

    public int OpenTickets { get; init; }
    public int TicketsThisMonth { get; init; }
    public int WorkOrdersThisMonth { get; init; }
}

public record AlertItem
{
    public required string Severity { get; init; } // error, warning, info
    public required string Title { get; init; }
    public required string Message { get; init; }
    public string? ActionUrl { get; init; }
}

public record OrgUsageMetrics
{
    public required UsageItem Users { get; init; }
    public required UsageItem Tickets { get; init; }
    public required UsageItem StorageGb { get; init; }
    public required UsageItem ApiCalls { get; init; }
}

public record UsageItem
{
    public int Current { get; init; }
    public int Limit { get; init; } // 0 = unlimited
    public double Percent { get; init; }
}
```

---

### 4. Frontend: Dashboard Service

**File**: `apps/web/src/app/core/services/dashboard.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SuperAdminMetrics {
  totalOrganisations: number;
  activeOrganisations: number;
  suspendedOrganisations: number;
  trialOrganisations: number;
  organisationGrowthPercent: number;
  totalUsers: number;
  activeUsers: number;
  userGrowthPercent: number;
  activeTicketsLast30Days: number;
}

export interface OrgAdminMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  inactiveUsers: number;
  openTickets: number;
  ticketsThisMonth: number;
  workOrdersThisMonth: number;
}

export interface AlertItem {
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
}

export interface UsageItem {
  current: number;
  limit: number; // 0 = unlimited
  percent: number;
}

export interface OrgUsageMetrics {
  users: UsageItem;
  tickets: UsageItem;
  storageGb: UsageItem;
  apiCalls: UsageItem;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private api = inject(ApiService);

  getSuperAdminMetrics(): Observable<ApiResponse<SuperAdminMetrics>> {
    return this.api.get<SuperAdminMetrics>('/admin/dashboard/super-metrics');
  }

  getOrgAdminMetrics(orgId: string): Observable<ApiResponse<OrgAdminMetrics>> {
    return this.api.get<OrgAdminMetrics>(`/admin/dashboard/org-metrics/${orgId}`);
  }

  getAlerts(): Observable<ApiResponse<AlertItem[]>> {
    return this.api.get<AlertItem[]>('/admin/dashboard/alerts');
  }

  getOrgUsage(orgId: string): Observable<ApiResponse<OrgUsageMetrics>> {
    return this.api.get<OrgUsageMetrics>(`/admin/organisations/${orgId}/usage`);
  }
}
```

---

### 5. Frontend: Super Admin Dashboard Component

**File**: `apps/web/src/app/features/admin/super/dashboard.component.ts`

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService, SuperAdminMetrics, AlertItem } from '../../../core/services/dashboard.service';
import { MetricCardComponent } from './components/metric-card.component';
import { AlertBannerComponent } from './components/alert-banner.component';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MetricCardComponent,
    AlertBannerComponent
  ],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Super Admin Dashboard</h1>
        <button mat-raised-button (click)="refresh()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>error</mat-icon>
          <p>{{ error() }}</p>
        </div>
      } @else {
        <!-- Alerts -->
        @if (alerts() && alerts()!.length > 0) {
          <div class="alerts-section">
            @for (alert of alerts(); track alert.title) {
              <app-alert-banner
                [severity]="alert.severity"
                [title]="alert.title"
                [message]="alert.message"
                [actionUrl]="alert.actionUrl"
              />
            }
          </div>
        }

        <!-- Metric Cards -->
        <div class="metrics-grid">
          <app-metric-card
            icon="business"
            label="Total Organisations"
            [value]="metrics()!.totalOrganisations"
            [subtitle]="getOrgSubtitle()"
            [trend]="metrics()!.organisationGrowthPercent"
            (click)="navigateToOrganisations()"
          />

          <app-metric-card
            icon="people"
            label="Total Users"
            [value]="metrics()!.totalUsers"
            [subtitle]="getUserSubtitle()"
            [trend]="metrics()!.userGrowthPercent"
            (click)="navigateToUsers()"
          />

          <app-metric-card
            icon="confirmation_number"
            label="Active Tickets"
            [value]="metrics()!.activeTicketsLast30Days"
            subtitle="Last 30 days"
            (click)="navigateToTickets()"
          />

          <app-metric-card
            icon="check_circle"
            label="System Health"
            value="Healthy"
            subtitle="All systems operational"
            [isHealthy]="true"
            (click)="navigateToHealth()"
          />
        </div>

        <!-- Charts Section -->
        <div class="charts-grid">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Organisation Growth</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- TODO: Add chart component -->
              <p class="placeholder">Chart: Organisation growth over last 12 months</p>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>User Signups</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- TODO: Add chart component -->
              <p class="placeholder">Chart: User signups over last 30 days</p>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .dashboard-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 500;
    }

    .alerts-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .error-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #f44336;
      margin-bottom: 16px;
    }

    .placeholder {
      text-align: center;
      padding: 48px;
      color: rgba(0, 0, 0, 0.54);
      font-style: italic;
    }
  `]
})
export class SuperAdminDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);

  metrics = signal<SuperAdminMetrics | null>(null);
  alerts = signal<AlertItem[] | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load metrics
    this.dashboardService.getSuperAdminMetrics().subscribe({
      next: (response) => {
        if (response.data) {
          this.metrics.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load dashboard metrics');
        this.loading.set(false);
        console.error('Dashboard error:', err);
      }
    });

    // Load alerts
    this.dashboardService.getAlerts().subscribe({
      next: (response) => {
        if (response.data) {
          this.alerts.set(response.data);
        }
      },
      error: (err) => {
        console.error('Alerts error:', err);
      }
    });
  }

  refresh(): void {
    this.loadDashboard();
  }

  getOrgSubtitle(): string {
    const m = this.metrics();
    if (!m) return '';
    return `${m.activeOrganisations} active, ${m.suspendedOrganisations} suspended`;
  }

  getUserSubtitle(): string {
    const m = this.metrics();
    if (!m) return '';
    return `${m.activeUsers} active`;
  }

  navigateToOrganisations(): void {
    this.router.navigate(['/admin/organisations']);
  }

  navigateToUsers(): void {
    this.router.navigate(['/admin/users-platform']);
  }

  navigateToTickets(): void {
    // TODO: Navigate to tickets overview
  }

  navigateToHealth(): void {
    this.router.navigate(['/admin/support-tools'], { fragment: 'health' });
  }
}
```

---

### 6. Frontend: Metric Card Component

**File**: `apps/web/src/app/features/admin/super/components/metric-card.component.ts`

```typescript
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card class="metric-card" [class.clickable]="true">
      <mat-card-content>
        <div class="metric-header">
          <div class="metric-icon" [class.healthy]="isHealthy()">
            <mat-icon>{{ icon() }}</mat-icon>
          </div>
          @if (trend() !== undefined && trend() !== null) {
            <div class="metric-trend" [class.positive]="trend()! > 0" [class.negative]="trend()! < 0">
              <mat-icon>{{ trend()! > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
              <span>{{ Math.abs(trend()!) }}%</span>
            </div>
          }
        </div>

        <div class="metric-value">{{ value() }}</div>
        <div class="metric-label">{{ label() }}</div>

        @if (subtitle()) {
          <div class="metric-subtitle">{{ subtitle() }}</div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .metric-card {
      cursor: pointer;
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }

    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background-color: rgba(33, 150, 243, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .metric-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #2196f3;
    }

    .metric-icon.healthy {
      background-color: rgba(76, 175, 80, 0.1);
    }

    .metric-icon.healthy mat-icon {
      color: #4caf50;
    }

    .metric-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 500;
    }

    .metric-trend.positive {
      color: #4caf50;
    }

    .metric-trend.negative {
      color: #f44336;
    }

    .metric-trend mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 600;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .metric-label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
      margin-bottom: 4px;
    }

    .metric-subtitle {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
    }
  `]
})
export class MetricCardComponent {
  icon = input.required<string>();
  label = input.required<string>();
  value = input.required<string | number>();
  subtitle = input<string>();
  trend = input<number>();
  isHealthy = input<boolean>(false);

  Math = Math;
}
```

---

## File Change Summary

### Backend Files (32 new, 3 modified)

**New Entities** (7):
- SubscriptionPlan.cs
- FeatureFlag.cs
- FeatureFlagOverride.cs
- ApiKey.cs
- Webhook.cs
- PlatformSetting.cs
- UserInvite.cs (optional)

**New Services** (8):
- SubscriptionPlanService.cs
- FeatureFlagService.cs
- ApiKeyService.cs
- WebhookService.cs
- DashboardService.cs
- PlatformSettingsService.cs
- ImpersonationService.cs
- DataExportService.cs

**New Contracts/DTOs** (~15):
- Plans/*
- FeatureFlags/*
- ApiKeys/*
- Webhooks/*
- Dashboard/*
- Settings/*

**Modified**:
- Program.cs (add ~36 new endpoints)
- OrganisationService.cs (add 3 methods)
- UserManagementService.cs (add 5 methods)

**New Tests** (8):
- SubscriptionPlanServiceTests.cs
- FeatureFlagServiceTests.cs
- ApiKeyServiceTests.cs
- WebhookServiceTests.cs
- DashboardServiceTests.cs
- PlatformSettingsServiceTests.cs
- ImpersonationServiceTests.cs
- DataExportServiceTests.cs

**Migration** (1):
- 20260106_AddAdminExpansion.cs

### Frontend Files (~55 new, 5 modified)

**New Services** (8):
- subscription-plan.service.ts
- feature-flag.service.ts
- api-key.service.ts
- webhook.service.ts
- dashboard.service.ts
- platform-settings.service.ts
- impersonation.service.ts
- data-export.service.ts

**Modified Services** (2):
- organisation.service.ts
- user-management.service.ts

**New Super Admin Components** (~25):
- dashboard.component.ts
- users-platform.component.ts
- organisations/organisation-list.component.ts (enhanced)
- organisations/organisation-detail.component.ts (tabbed)
- organisations/tabs/* (6 tab components)
- organisations/dialogs/* (2 dialogs)
- plans/* (2 components)
- feature-flags/* (3 components)
- integrations-platform.component.ts
- integrations/* (2 components)
- support-tools.component.ts
- support/* (3 panels)
- platform-settings.component.ts
- settings/* (3 tabs)

**New Org Admin Components** (~10):
- org-dashboard.component.ts
- users/* (3 components - enhanced)
- org-settings.component.ts
- settings/* (3 tabs)
- org-billing.component.ts
- org-integrations.component.ts
- integrations/* (2 panels)

**New Shared Components** (~7):
- metric-card.component.ts
- alert-banner.component.ts
- usage-progress-bar.component.ts
- status-badge.component.ts
- confirmation-dialog.component.ts
- bytes.pipe.ts

**Modified**:
- app.routes.ts (restructure admin routes)
- admin-shell.component.ts (enhance layout)
- auth.service.ts (no changes needed - already has role tracking)

**New Tests** (~20 spec files)

---

## Next Steps

1. **Review & Approve Plan**: Read through specification, verify it meets requirements
2. **Phase 1 Start**: Create database migration, run on dev environment
3. **Backend Implementation**: Follow Phase 2 steps, test endpoints with Swagger
4. **Frontend Implementation**: Follow Phases 3-5, test in browser
5. **Testing**: Execute Phase 6 test plan
6. **Documentation**: Update CLAUDE.md and deployment guides
7. **Production Deploy**: Follow deployment checklist

---

## Estimated Effort

- **Backend**: 5 days (1 senior developer)
- **Frontend**: 7 days (1 senior developer)
- **Testing**: 2 days (QA)
- **Documentation**: 2 days (Tech Writer)
- **Total**: ~16 days (3-4 weeks calendar time)

---

*End of Implementation Plan*
