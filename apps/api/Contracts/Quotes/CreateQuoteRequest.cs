namespace MaintainUk.Api.Contracts.Quotes;

public record CreateQuoteRequest(
    Guid WorkOrderId,
    decimal SubtotalGBP,
    decimal VatGBP,
    decimal TotalGBP,
    string? LineItemsJson,
    string? Notes,
    DateTime? ExpiresAt
);

