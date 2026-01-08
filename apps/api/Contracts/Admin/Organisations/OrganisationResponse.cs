namespace MaintainUk.Api.Contracts.Admin.Organisations;

public record OrganisationResponse(
    Guid Id,
    string Name,
    string Slug,
    string Plan,
    string Status,
    Guid? PrimaryAdminUserId,
    DateTime CreatedAt,
    int UserCount
);
