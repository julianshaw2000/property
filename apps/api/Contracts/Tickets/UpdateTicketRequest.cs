using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Contracts.Tickets;

public record UpdateTicketRequest(
    TicketStatus? Status,
    TicketPriority? Priority,
    Guid? AssignedToUserId,
    string? ResolutionNotes
);

