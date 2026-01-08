using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Infrastructure.Persistence;

/// <summary>
/// Seeds deterministic data to support admin Playwright E2E tests.
/// Idempotent: safe to run multiple times.
/// </summary>
public class AdminE2eDataSeeder
{
    private readonly MaintainUkDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public AdminE2eDataSeeder(
        MaintainUkDbContext context,
        IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task SeedAsync(
        string superAdminEmail = "julianshaw2000@gmail.com",
        string superAdminPassword = "Gl@ria100")
    {
        // Ensure core admin catalog data exists (plans + feature flags)
        var adminSeeder = new AdminDataSeeder(_context);
        await adminSeeder.SeedAsync();

        // Ensure primary organisation + SuperAdmin user exist
        var (primaryOrg, superAdmin) = await EnsureSuperAdminAsync(superAdminEmail, superAdminPassword);

        // Ensure at least one additional organisation for cross-org views
        var secondaryOrg = await EnsureSecondaryOrganisationAsync();

        // Ensure some additional users so that user counts / RBAC tables have data
        await EnsureAdditionalUsersAsync(primaryOrg, secondaryOrg);

        // Seed a small set of audit logs so audit-log views are not empty
        await EnsureAuditLogsAsync(primaryOrg, secondaryOrg, superAdmin);
    }

    private async Task<(Organisation org, User superAdmin)> EnsureSuperAdminAsync(
        string email,
        string password)
    {
        // Try to find existing user (ignore filters so suspended / other-org users are visible)
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.Organisation)
            .FirstOrDefaultAsync(u => u.Email == email);

        Organisation org;

        if (user == null)
        {
            // Create primary organisation
            org = new Organisation
            {
                Name = "Demo Property Management",
                Slug = "demo-property-management",
                Status = OrganisationStatus.Active,
                Plan = Domain.Enums.SubscriptionPlan.Professional
            };

            // Attach Professional subscription plan if available
            var professionalPlan = await _context.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Slug == "professional");
            if (professionalPlan != null)
            {
                org.PlanId = professionalPlan.Id;
            }

            _context.Organisations.Add(org);
            await _context.SaveChangesAsync();

            // Create SuperAdmin user
            user = new User
            {
                OrgId = org.Id,
                Email = email,
                PasswordHash = _passwordHasher.HashPassword(password),
                Role = UserRole.SuperAdmin,
                FirstName = "Julian",
                LastName = "Shaw",
                IsActive = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }
        else
        {
            org = user.Organisation ?? await _context.Organisations
                .IgnoreQueryFilters()
                .FirstAsync(o => o.Id == user.OrgId);

            // Normalise role, password and flags
            user.Role = UserRole.SuperAdmin;
            user.IsActive = true;
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                user.PasswordHash = _passwordHasher.HashPassword(password);
            }

            org.Status = OrganisationStatus.Active;
            org.Plan = Domain.Enums.SubscriptionPlan.Professional;

            var professionalPlan = await _context.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Slug == "professional");
            if (professionalPlan != null)
            {
                org.PlanId = professionalPlan.Id;
            }

            if (org.PrimaryAdminUserId != user.Id)
            {
                org.PrimaryAdminUserId = user.Id;
            }

            await _context.SaveChangesAsync();
        }

        return (org, user);
    }

    private async Task<Organisation> EnsureSecondaryOrganisationAsync()
    {
        var existing = await _context.Organisations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Slug == "test-organisation-e2e");

        if (existing != null)
        {
            return existing;
        }

        var org = new Organisation
        {
            Name = "Test Organisation E2E",
            Slug = "test-organisation-e2e",
            Status = OrganisationStatus.Active,
            Plan = Domain.Enums.SubscriptionPlan.Professional
        };

        var professionalPlan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Slug == "professional");
        if (professionalPlan != null)
        {
            org.PlanId = professionalPlan.Id;
        }

        _context.Organisations.Add(org);
        await _context.SaveChangesAsync();

        return org;
    }

    private async Task EnsureAdditionalUsersAsync(Organisation primaryOrg, Organisation secondaryOrg)
    {
        // One OrgAdmin + one Coordinator on primary org
        await EnsureUserAsync(
            org: primaryOrg,
            email: "orgadmin.e2e@demo.com",
            role: UserRole.OrgAdmin,
            firstName: "Org",
            lastName: "Admin");

        await EnsureUserAsync(
            org: primaryOrg,
            email: "coordinator.e2e@demo.com",
            role: UserRole.Coordinator,
            firstName: "Test",
            lastName: "Coordinator");

        // One Viewer on secondary org so cross-org tables have multiple rows
        await EnsureUserAsync(
            org: secondaryOrg,
            email: "viewer.e2e@demo.com",
            role: UserRole.Viewer,
            firstName: "Test",
            lastName: "Viewer");
    }

    private async Task<User> EnsureUserAsync(
        Organisation org,
        string email,
        UserRole role,
        string firstName,
        string lastName)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && u.OrgId == org.Id);

        if (user != null)
        {
            // Normalise in case previous runs changed data
            user.Role = role;
            user.IsActive = true;
            user.FirstName ??= firstName;
            user.LastName ??= lastName;
            await _context.SaveChangesAsync();
            return user;
        }

        user = new User
        {
            OrgId = org.Id,
            Email = email,
            PasswordHash = _passwordHasher.HashPassword("TestPassword123!"),
            Role = role,
            FirstName = firstName,
            LastName = lastName,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return user;
    }

    private async Task EnsureAuditLogsAsync(
        Organisation primaryOrg,
        Organisation secondaryOrg,
        User superAdmin)
    {
        // If any audit logs already exist, don't duplicate – tests only require that some data exists.
        if (await _context.AuditLogs.AnyAsync())
        {
            return;
        }

        var logs = new List<AuditLog>
        {
            new()
            {
                OrgId = primaryOrg.Id,
                UserId = superAdmin.Id,
                Action = "organisation.created",
                EntityType = "Organisation",
                EntityId = primaryOrg.Id,
                ChangesSummaryJson = JsonSerializer.Serialize(new { primaryOrg.Name, Plan = "Professional" }),
                IpAddress = "127.0.0.1"
            },
            new()
            {
                OrgId = primaryOrg.Id,
                UserId = superAdmin.Id,
                Action = "user.invited",
                EntityType = "User",
                EntityId = Guid.NewGuid(),
                ChangesSummaryJson = JsonSerializer.Serialize(new { Email = "coordinator.e2e@demo.com", Role = "Coordinator" }),
                IpAddress = "127.0.0.1"
            },
            new()
            {
                OrgId = primaryOrg.Id,
                UserId = superAdmin.Id,
                Action = "user.role_changed",
                EntityType = "User",
                EntityId = Guid.NewGuid(),
                ChangesSummaryJson = JsonSerializer.Serialize(new { OldRole = "Viewer", NewRole = "OrgAdmin" }),
                IpAddress = "127.0.0.1"
            },
            new()
            {
                OrgId = secondaryOrg.Id,
                UserId = superAdmin.Id,
                Action = "organisation.suspended",
                EntityType = "Organisation",
                EntityId = secondaryOrg.Id,
                ChangesSummaryJson = JsonSerializer.Serialize(new { OldStatus = "Active", NewStatus = "Suspended" }),
                IpAddress = "127.0.0.1"
            },
            new()
            {
                OrgId = secondaryOrg.Id,
                UserId = superAdmin.Id,
                Action = "organisation.reactivated",
                EntityType = "Organisation",
                EntityId = secondaryOrg.Id,
                ChangesSummaryJson = JsonSerializer.Serialize(new { OldStatus = "Suspended", NewStatus = "Active" }),
                IpAddress = "127.0.0.1"
            }
        };

        _context.AuditLogs.AddRange(logs);
        await _context.SaveChangesAsync();
    }
}

