using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Contracts.Tickets;

public record TicketDetailResponse(
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
    string? ReportedByPhone,
    string? ReportedByEmail,
    Guid? AssignedToUserId,
    string? AssignedToName,
    string? ResolutionNotes,
    DateTime? ResolvedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<TimelineEventResponse> Timeline
);

public record TimelineEventResponse(
    Guid Id,
    string EventType,
    string? Description,
    Guid? ActorUserId,
    string? ActorName,
    DateTime CreatedAt
);

