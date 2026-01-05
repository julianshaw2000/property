namespace MaintainUk.Api.Contracts.WorkOrders;

public record ScheduleWorkOrderRequest(
    DateTime ScheduledStartDate,
    DateTime? ScheduledEndDate
);

