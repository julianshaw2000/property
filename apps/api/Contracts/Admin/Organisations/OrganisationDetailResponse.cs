namespace MaintainUk.Api.Contracts.Admin.Organisations;

public record OrganisationDetailResponse(
    Guid Id,
    string Name,
    string Slug,
    string Plan,
    string Status,
    Guid? PrimaryAdminUserId,
    string? PrimaryAdminName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<UserSummary> Users
);

public record UserSummary(
    Guid Id,
    string Email,
    string Role,
    string Name,
    bool IsActive
);
