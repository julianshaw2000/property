using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class AuditLogService
{
    private readonly MaintainUkDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(MaintainUkDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(
        Guid orgId,
        Guid userId,
        string action,
        string entityType,
        Guid entityId,
        object? changes = null)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        var auditLog = new AuditLog
        {
            OrgId = orgId,
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            ChangesSummaryJson = changes != null
                ? JsonSerializer.Serialize(changes)
                : null,
            IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request.Headers["User-Agent"].ToString()
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AuditLog>> ListAuditLogsAsync(
        Guid? orgId = null,
        int skip = 0,
        int take = 100)
    {
        var query = _context.AuditLogs
            .Include(a => a.User)
            .AsQueryable();

        if (orgId.HasValue)
        {
            // Org-scoped query (for OrgAdmin)
            query = query.Where(a => a.OrgId == orgId.Value);
        }
        else
        {
            // Cross-org query (for SuperAdmin) - bypass filter
            query = query.IgnoreQueryFilters();
        }

        return await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }
}
