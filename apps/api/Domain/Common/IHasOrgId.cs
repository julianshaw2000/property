namespace MaintainUk.Api.Domain.Common;

/// <summary>
/// Interface for entities that belong to an organisation (multi-tenant)
/// </summary>
public interface IHasOrgId
{
    Guid OrgId { get; set; }
}

