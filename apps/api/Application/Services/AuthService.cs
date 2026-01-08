using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Contracts.Auth;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class AuthService
{
    private readonly MaintainUkDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtService _jwtService;
    private readonly AuditLogService _auditLogService;

    public AuthService(
        MaintainUkDbContext context,
        IPasswordHasher passwordHasher,
        IJwtService jwtService,
        AuditLogService auditLogService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
        _auditLogService = auditLogService;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        // Check if user exists (bypass query filter since we're not authenticated yet)
        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (existingUser != null)
        {
            return null; // User already exists
        }

        // Create organisation
        var org = new Organisation
        {
            Name = request.OrgName,
            Slug = GenerateSlug(request.OrgName),
            Plan = Domain.Enums.SubscriptionPlan.Free,
            Status = OrganisationStatus.Active
        };

        _context.Organisations.Add(org);
        await _context.SaveChangesAsync();

        // Create user as initial OrgAdmin for this new organisation
        var user = new User
        {
            OrgId = org.Id,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = UserRole.OrgAdmin,
            FirstName = request.FirstName,
            LastName = request.LastName,
            IsActive = true
        };

        _context.Users.Add(user);

        // If the organisation does not yet have a primary admin, set this first user as PrimaryAdmin
        if (org.PrimaryAdminUserId == null)
        {
            org.PrimaryAdminUserId = user.Id;
        }

        await _context.SaveChangesAsync();

        // Audit: record automatic first-user OrgAdmin + primary admin assignment
        await _auditLogService.LogAsync(
            orgId: org.Id,
            userId: user.Id,
            action: "ORG_USER_PROMOTED_TO_ADMIN",
            entityType: "User",
            entityId: user.Id,
            changes: new
            {
                Reason = "SelfServiceFirstUser",
                AssignedRole = user.Role.ToString(),
                org.PrimaryAdminUserId
            });

        // Generate tokens
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshTokenValue = _jwtService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return new AuthResponse(
            user.Id,
            user.OrgId,
            accessToken,
            refreshTokenValue,
            900, // 15 minutes in seconds
            user.Role.ToString(),
            user.FirstName,
            user.LastName
        );
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        // Bypass query filter since user isn't authenticated yet
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.Organisation)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || user.PasswordHash == null)
        {
            return null;
        }

        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            return null;
        }

        if (!user.IsActive)
        {
            return null; // User is deactivated
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;

        // Generate tokens
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshTokenValue = _jwtService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return new AuthResponse(
            user.Id,
            user.OrgId,
            accessToken,
            refreshTokenValue,
            900,
            user.Role.ToString(),
            user.FirstName,
            user.LastName
        );
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshTokenValue)
    {
        // Bypass query filter since user isn't authenticated yet
        var refreshToken = await _context.RefreshTokens
            .IgnoreQueryFilters()
            .Include(rt => rt.User)
                .ThenInclude(u => u.Organisation)
            .FirstOrDefaultAsync(rt => rt.Token == refreshTokenValue);

        if (refreshToken == null || refreshToken.IsRevoked || refreshToken.ExpiresAt < DateTime.UtcNow)
        {
            return null;
        }

        // Revoke old token
        refreshToken.IsRevoked = true;

        // Generate new tokens
        var accessToken = _jwtService.GenerateAccessToken(refreshToken.User);
        var newRefreshTokenValue = _jwtService.GenerateRefreshToken();

        var newRefreshToken = new RefreshToken
        {
            UserId = refreshToken.UserId,
            Token = newRefreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync();

        return new AuthResponse(
            refreshToken.User.Id,
            refreshToken.User.OrgId,
            accessToken,
            newRefreshTokenValue,
            900,
            refreshToken.User.Role.ToString(),
            refreshToken.User.FirstName,
            refreshToken.User.LastName
        );
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

