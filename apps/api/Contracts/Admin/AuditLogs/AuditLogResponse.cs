namespace MaintainUk.Api.Contracts.Admin.AuditLogs;

public record AuditLogResponse(
    Guid Id,
    Guid OrgId,
    Guid UserId,
    string UserEmail,
    string Action,
    string EntityType,
    Guid EntityId,
    string? ChangesSummaryJson,
    string? IpAddress,
    DateTime CreatedAt
);
