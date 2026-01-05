using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Contracts.Tickets;

public record TicketResponse(
    Guid Id,
    string TicketNumber,
    Guid OrgId,
    Guid UnitId,
    string UnitName,
    string PropertyAddress,
    TicketCategory Category,
    TicketPriority Priority,
    TicketStatus Status,
    string Title,
    string? Description,
    string? ReportedByName,
    Guid? AssignedToUserId,
    string? AssignedToName,
    DateTime? ResolvedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

