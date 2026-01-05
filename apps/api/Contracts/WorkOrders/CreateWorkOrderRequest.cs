namespace MaintainUk.Api.Contracts.WorkOrders;

public record CreateWorkOrderRequest(
    Guid TicketId,
    string? Description,
    DateTime? ScheduledStartDate,
    DateTime? ScheduledEndDate
);

