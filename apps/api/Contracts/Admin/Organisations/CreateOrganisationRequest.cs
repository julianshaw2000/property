namespace MaintainUk.Api.Contracts.Admin.Organisations;

public record CreateOrganisationRequest(
    string Name,
    string Plan,
    string? AdminEmail = null,
    string? AdminFirstName = null,
    string? AdminLastName = null,
    bool? SendInviteEmail = null,
    string? AdminPassword = null
);
