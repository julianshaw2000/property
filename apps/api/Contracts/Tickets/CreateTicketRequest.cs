using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Contracts.Tickets;

public record CreateTicketRequest(
    Guid UnitId,
    TicketCategory Category,
    TicketPriority Priority,
    string Title,
    string? Description,
    string? ReportedByName,
    string? ReportedByPhone,
    string? ReportedByEmail
);

