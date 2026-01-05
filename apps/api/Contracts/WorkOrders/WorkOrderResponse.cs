using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Contracts.WorkOrders;

public record WorkOrderResponse(
    Guid Id,
    string WorkOrderNumber,
    Guid TicketId,
    string TicketNumber,
    WorkOrderStatus Status,
    string? Description,
    Guid? AssignedContractorId,
    string? AssignedContractorName,
    DateTime? ScheduledStartDate,
    DateTime? ScheduledEndDate,
    DateTime? ActualStartDate,
    DateTime? ActualEndDate,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

