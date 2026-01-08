using System.Security.Claims;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Infrastructure.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)
                       ?? principal.FindFirst("sub");

        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return userId;
        }

        throw new UnauthorizedAccessException("Invalid user ID in token");
    }

    public static Guid GetOrgId(this ClaimsPrincipal principal)
    {
        var orgIdClaim = principal.FindFirst("orgId");

        if (orgIdClaim != null && Guid.TryParse(orgIdClaim.Value, out var orgId))
        {
            return orgId;
        }

        throw new UnauthorizedAccessException("Invalid org ID in token");
    }

    public static string GetEmail(this ClaimsPrincipal principal)
    {
        var emailClaim = principal.FindFirst(ClaimTypes.Email)
                      ?? principal.FindFirst("email");

        return emailClaim?.Value ?? throw new UnauthorizedAccessException("Email not found in token");
    }

    public static string GetRole(this ClaimsPrincipal principal)
    {
        var roleClaim = principal.FindFirst(ClaimTypes.Role)
                     ?? principal.FindFirst("role");

        return roleClaim?.Value ?? throw new UnauthorizedAccessException("Role not found in token");
    }

    public static UserRole GetRoleEnum(this ClaimsPrincipal principal)
    {
        var roleString = principal.GetRole();
        if (Enum.TryParse<UserRole>(roleString, out var role))
        {
            return role;
        }
        throw new UnauthorizedAccessException($"Invalid role: {roleString}");
    }

    public static bool IsSuperAdmin(this ClaimsPrincipal principal)
    {
        return principal.GetRoleEnum() == UserRole.SuperAdmin;
    }

    public static bool IsOrgAdmin(this ClaimsPrincipal principal)
    {
        var role = principal.GetRoleEnum();
        return role == UserRole.SuperAdmin || role == UserRole.OrgAdmin;
    }
}

