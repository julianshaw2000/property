using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class OrganisationService
{
    private readonly MaintainUkDbContext _context;
    private readonly AuditLogService _auditLog;
    private readonly IOutboxPublisher _outboxPublisher;

    public OrganisationService(
        MaintainUkDbContext context,
        AuditLogService auditLog,
        IOutboxPublisher outboxPublisher)
    {
        _context = context;
        _auditLog = auditLog;
        _outboxPublisher = outboxPublisher;
    }

    public async Task<List<Organisation>> ListOrganisationsAsync(
        int skip = 0,
        int take = 50,
        string? search = null,
        string? plan = null,
        string? status = null,
        DateTime? createdFrom = null,
        DateTime? createdTo = null)
    {
        // SuperAdmin calls this - no org filter needed (bypassed)
        var query = _context.Organisations
            .IgnoreQueryFilters() // Explicit bypass for clarity
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(o =>
                o.Name.ToLower().Contains(term) ||
                o.Slug.ToLower().Contains(term) ||
                (o.BillingEmail != null && o.BillingEmail.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(plan))
        {
            var tokens = plan.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var allowedPlans = tokens
                .Select(p => Enum.TryParse<Domain.Enums.SubscriptionPlan>(p, true, out var parsed) ? parsed : (Domain.Enums.SubscriptionPlan?)null)
                .Where(p => p.HasValue)
                .Select(p => p!.Value)
                .ToList();

            if (allowedPlans.Count > 0)
            {
                query = query.Where(o => allowedPlans.Contains(o.Plan));
            }
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var tokens = status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var allowedStatuses = tokens
                .Select(s => Enum.TryParse<OrganisationStatus>(s, true, out var parsed) ? parsed : (OrganisationStatus?)null)
                .Where(s => s.HasValue)
                .Select(s => s!.Value)
                .ToList();

            if (allowedStatuses.Count > 0)
            {
                query = query.Where(o => allowedStatuses.Contains(o.Status));
            }
        }

        if (createdFrom.HasValue)
        {
            query = query.Where(o => o.CreatedAt >= createdFrom.Value);
        }

        if (createdTo.HasValue)
        {
            query = query.Where(o => o.CreatedAt <= createdTo.Value);
        }

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<Organisation?> GetOrganisationAsync(Guid orgId)
    {
        return await _context.Organisations
            .IgnoreQueryFilters()
            .Include(o => o.Users)
            .Include(o => o.PrimaryAdmin)
            .FirstOrDefaultAsync(o => o.Id == orgId);
    }

    public async Task<Organisation> CreateOrganisationAsync(
        string name,
        string plan,
        Guid createdByUserId,
        string? adminEmail,
        string? adminFirstName,
        string? adminLastName,
        bool? sendInviteEmail,
        string? adminPassword,
        IPasswordHasher passwordHasher)
    {
        // Use a transaction so org + admin user are created atomically
        using var tx = await _context.Database.BeginTransactionAsync();

        var org = new Organisation
        {
            Name = name,
            Slug = GenerateSlug(name),
            Plan = Enum.Parse<Domain.Enums.SubscriptionPlan>(plan),
            Status = OrganisationStatus.Active
        };

        _context.Organisations.Add(org);
        await _context.SaveChangesAsync();

        // Always log organisation creation
        await _auditLog.LogAsync(
            orgId: org.Id,
            userId: createdByUserId,
            action: "organisation.created",
            entityType: "Organisation",
            entityId: org.Id,
            changes: new { Name = org.Name, Plan = org.Plan.ToString() }
        );

        // If no admin details are supplied, keep this endpoint backwards compatible:
        // callers can create the first user later via UserManagementService.CreateUserAsync,
        // which will automatically assign OrgAdmin and PrimaryAdminUserId for the first user.
        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            await tx.CommitAsync();
            return org;
        }

        // Create initial OrgAdmin user when admin details are provided
        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == adminEmail && u.OrgId == org.Id);

        if (existingUser != null)
        {
            throw new InvalidOperationException($"User with email {adminEmail} already exists in this organisation.");
        }

        var effectiveSendInviteEmail = sendInviteEmail ?? true;

        string? passwordHash = null;
        if (!effectiveSendInviteEmail)
        {
            // For direct-password flow we expect a password; in production you may enforce stronger rules
            if (string.IsNullOrWhiteSpace(adminPassword))
            {
                throw new InvalidOperationException("Admin password is required when SendInviteEmail is false.");
            }

            passwordHash = passwordHasher.HashPassword(adminPassword);
        }

        var adminUser = new User
        {
            OrgId = org.Id,
            Email = adminEmail,
            PasswordHash = passwordHash,
            Role = UserRole.OrgAdmin,
            FirstName = adminFirstName,
            LastName = adminLastName,
            IsActive = true
        };

        _context.Users.Add(adminUser);

        // Set as primary admin
        org.PrimaryAdminUserId = adminUser.Id;

        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: org.Id,
            userId: createdByUserId,
            action: "user.created",
            entityType: "User",
            entityId: adminUser.Id,
            changes: new { adminUser.Email, adminUser.Role }
        );

        // Queue invite email only when using invite flow
        if (effectiveSendInviteEmail)
        {
            await _outboxPublisher.PublishEmailAsync(
                org.Id,
                "user.invited",
                new
                {
                    to = adminUser.Email,
                    subject = $"You have been invited to {org.Name} on MaintainUK",
                    body =
                        $"Hi {adminUser.FirstName ?? adminUser.Email},\n\n" +
                        $"You have been invited to join the organisation \"{org.Name}\" on MaintainUK.\n\n" +
                        "Please check your email for login details or follow the invitation link if provided.\n\n" +
                        "Thanks,\nMaintainUK"
                });
        }

        await tx.CommitAsync();

        return org;
    }

    public async Task<bool> SuspendOrganisationAsync(Guid orgId, Guid suspendedByUserId)
    {
        var org = await _context.Organisations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Id == orgId);

        if (org == null || org.Status == OrganisationStatus.Suspended)
        {
            return false;
        }

        var oldStatus = org.Status;
        org.Status = OrganisationStatus.Suspended;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: orgId,
            userId: suspendedByUserId,
            action: "organisation.suspended",
            entityType: "Organisation",
            entityId: orgId,
            changes: new { OldStatus = oldStatus.ToString(), NewStatus = "Suspended" }
        );

        return true;
    }

    public async Task<bool> ReactivateOrganisationAsync(Guid orgId, Guid reactivatedByUserId)
    {
        var org = await _context.Organisations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Id == orgId);

        if (org == null || org.Status == OrganisationStatus.Active)
        {
            return false;
        }

        var oldStatus = org.Status;
        org.Status = OrganisationStatus.Active;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: orgId,
            userId: reactivatedByUserId,
            action: "organisation.reactivated",
            entityType: "Organisation",
            entityId: orgId,
            changes: new { OldStatus = oldStatus.ToString(), NewStatus = "Active" }
        );

        return true;
    }

    private static string GenerateSlug(string name)
    {
        return name.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("&", "and")
            .Trim('-')
            + "-" + Guid.NewGuid().ToString()[..8];
    }
}
