namespace MaintainUk.Api.Contracts.Admin.Users;

public record CreateUserRequest(
    string Email,
    string Role,
    string? FirstName,
    string? LastName,
    string? PhoneE164,
    string? Password,
    bool SendInviteEmail = true
);
