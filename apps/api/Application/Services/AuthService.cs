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

    public AuthService(
        MaintainUkDbContext context,
        IPasswordHasher passwordHasher,
        IJwtService jwtService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
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
            Plan = SubscriptionPlan.Free,
            Status = OrganisationStatus.Active
        };

        _context.Organisations.Add(org);
        await _context.SaveChangesAsync();

        // Create user
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
        await _context.SaveChangesAsync();

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
            900 // 15 minutes in seconds
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
            900
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
            900
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

