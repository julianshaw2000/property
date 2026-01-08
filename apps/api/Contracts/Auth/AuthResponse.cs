namespace MaintainUk.Api.Contracts.Auth;

public record AuthResponse(
    Guid UserId,
    Guid OrgId,
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    string Role,
    string? FirstName,
    string? LastName
);

