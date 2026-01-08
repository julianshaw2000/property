namespace MaintainUk.Api.Contracts.Admin.Users;

public record UserResponse(
    Guid Id,
    string Email,
    string Role,
    string? FirstName,
    string? LastName,
    bool IsActive,
    DateTime CreatedAt
);
