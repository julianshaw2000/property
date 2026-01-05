namespace MaintainUk.Api.Contracts.Auth;

public record RegisterRequest(
    string Email,
    string Password,
    string OrgName,
    string FirstName,
    string LastName
);

