using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;
using MaintainUk.Api.Infrastructure.Security;

namespace MaintainUk.Api.Application.Services;

public class UserManagementService
{
    private readonly MaintainUkDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly AuditLogService _auditLog;
    private readonly IOutboxPublisher _outboxPublisher;

    public UserManagementService(
        MaintainUkDbContext context,
        IPasswordHasher passwordHasher,
        AuditLogService auditLog,
        IOutboxPublisher outboxPublisher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _auditLog = auditLog;
        _outboxPublisher = outboxPublisher;
    }

    public async Task<List<User>> ListUsersAsync(Guid orgId, int skip = 0, int take = 50)
    {
        return await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.OrgId == orgId)
            .OrderBy(u => u.Email)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<User> CreateUserAsync(
        string email,
        string role,
        Guid orgId,
        Guid createdByUserId,
        string? firstName = null,
        string? lastName = null,
        string? phoneE164 = null,
        string? password = null,
        bool sendInviteEmail = true)
    {
        // Validate: OrgAdmin cannot create SuperAdmin users
        var requestedRole = Enum.Parse<UserRole>(role);
        if (requestedRole == UserRole.SuperAdmin)
        {
            throw new UnauthorizedAccessException("Only SuperAdmin can create SuperAdmin users");
        }

        // Check for duplicate email within org (bypass org query filter explicitly)
        var existing = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && u.OrgId == orgId);
        if (existing != null)
        {
            throw new InvalidOperationException("User with this email already exists in organisation");
        }

        var user = new User
        {
            OrgId = orgId,
            Email = email,
            PasswordHash = sendInviteEmail
                ? null // Invite flow: user sets password later
                : _passwordHasher.HashPassword(password!),
            Role = requestedRole,
            FirstName = firstName,
            LastName = lastName,
            PhoneE164 = phoneE164,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // If this is the first user in the organisation, automatically promote to OrgAdmin
        // and set as PrimaryAdminUserId (if not already set)
        var hasOtherUsersInOrg = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.OrgId == orgId && u.Id != user.Id);

        if (!hasOtherUsersInOrg)
        {
            var originalRole = user.Role;

            if (user.Role != UserRole.OrgAdmin)
            {
                user.Role = UserRole.OrgAdmin;
            }

            var org = await _context.Organisations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Id == orgId);

            if (org != null && org.PrimaryAdminUserId == null)
            {
                org.PrimaryAdminUserId = user.Id;
            }

            await _context.SaveChangesAsync();

            await _auditLog.LogAsync(
                orgId: orgId,
                userId: createdByUserId,
                action: "ORG_USER_PROMOTED_TO_ADMIN",
                entityType: "User",
                entityId: user.Id,
                changes: new
                {
                    PreviousRole = originalRole.ToString(),
                    NewRole = user.Role.ToString(),
                    IsFirstUserInOrganisation = true
                });
        }

        await _auditLog.LogAsync(
            orgId: orgId,
            userId: createdByUserId,
            action: sendInviteEmail ? "user.invited" : "user.created",
            entityType: "User",
            entityId: user.Id,
            changes: new { Email = user.Email, Role = user.Role.ToString() }
        );

        // Queue invite email only when using invite flow
        if (sendInviteEmail)
        {
            var org = await _context.Organisations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Id == orgId);

            await _outboxPublisher.PublishEmailAsync(
                orgId,
                "user.invited",
                new
                {
                    to = user.Email,
                    subject = org != null
                        ? $"You have been invited to {org.Name} on MaintainUK"
                        : "You have been invited to MaintainUK",
                    body =
                        $"Hi {user.FirstName ?? user.Email},\n\n" +
                        (org != null
                            ? $"You have been invited to join the organisation \"{org.Name}\" on MaintainUK.\n\n"
                            : "You have been invited to join MaintainUK.\n\n") +
                        "Please check your email for login details or follow the invitation link if provided.\n\n" +
                        "Thanks,\nMaintainUK"
                });
        }

        return user;
    }

    public async Task<User?> UpdateUserRoleAsync(
        Guid userId,
        Guid orgId,
        string newRoleString,
        Guid updatedByUserId)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.Organisation)
            .FirstOrDefaultAsync(u => u.Id == userId && u.OrgId == orgId);

        if (user == null)
        {
            return null;
        }

        var newRole = Enum.Parse<UserRole>(newRoleString);
        var oldRole = user.Role;

        // VALIDATION 1: Prevent demoting the Primary Admin
        if (user.Organisation.PrimaryAdminUserId == userId && newRole != UserRole.OrgAdmin)
        {
            throw new InvalidOperationException(
                "Cannot change role of Primary Admin. Assign a new Primary Admin first.");
        }

        // VALIDATION 2: Prevent removing the last OrgAdmin
        if (oldRole == UserRole.OrgAdmin && newRole != UserRole.OrgAdmin)
        {
            var adminCount = await _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.OrgId == orgId && u.Role == UserRole.OrgAdmin && u.IsActive)
                .CountAsync();

            if (adminCount <= 1)
            {
                throw new InvalidOperationException(
                    "Cannot demote the last OrgAdmin. Promote another user to OrgAdmin first.");
            }
        }

        user.Role = newRole;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: orgId,
            userId: updatedByUserId,
            action: "user.role_changed",
            entityType: "User",
            entityId: userId,
            changes: new { OldRole = oldRole.ToString(), NewRole = newRole.ToString() }
        );

        return user;
    }

    public async Task<bool> DeactivateUserAsync(Guid userId, Guid orgId, Guid deactivatedByUserId)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.Organisation)
            .FirstOrDefaultAsync(u => u.Id == userId && u.OrgId == orgId);

        if (user == null || !user.IsActive)
        {
            return false;
        }

        // VALIDATION 1: Prevent deactivating Primary Admin
        if (user.Organisation.PrimaryAdminUserId == userId)
        {
            throw new InvalidOperationException(
                "Cannot deactivate Primary Admin. Assign a new Primary Admin first.");
        }

        // VALIDATION 2: Prevent deactivating last OrgAdmin
        if (user.Role == UserRole.OrgAdmin)
        {
            var activeAdminCount = await _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.OrgId == orgId && u.Role == UserRole.OrgAdmin && u.IsActive)
                .CountAsync();

            if (activeAdminCount <= 1)
            {
                throw new InvalidOperationException(
                    "Cannot deactivate the last active OrgAdmin. Activate or promote another user first.");
            }
        }

        user.IsActive = false;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: orgId,
            userId: deactivatedByUserId,
            action: "user.deactivated",
            entityType: "User",
            entityId: userId,
            changes: new { Email = user.Email }
        );

        return true;
    }

    public async Task<bool> SetPrimaryAdminAsync(
        Guid orgId,
        Guid newPrimaryAdminUserId,
        Guid setByUserId)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == newPrimaryAdminUserId && u.OrgId == orgId);

        if (user == null || !user.IsActive)
        {
            throw new InvalidOperationException("User not found or inactive");
        }

        if (user.Role != UserRole.OrgAdmin)
        {
            throw new InvalidOperationException("Primary Admin must have OrgAdmin role");
        }

        var org = await _context.Organisations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Id == orgId);

        if (org == null)
        {
            return false;
        }

        var oldPrimaryAdminId = org.PrimaryAdminUserId;
        org.PrimaryAdminUserId = newPrimaryAdminUserId;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync(
            orgId: orgId,
            userId: setByUserId,
            action: "organisation.primary_admin_changed",
            entityType: "Organisation",
            entityId: orgId,
            changes: new
            {
                OldPrimaryAdminId = oldPrimaryAdminId?.ToString(),
                NewPrimaryAdminId = newPrimaryAdminUserId.ToString()
            }
        );

        return true;
    }
}
