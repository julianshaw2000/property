using System.Security.Claims;

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
}

