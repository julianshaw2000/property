using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Contracts.Quotes;

public record QuoteResponse(
    Guid Id,
    string QuoteNumber,
    Guid WorkOrderId,
    string WorkOrderNumber,
    QuoteStatus Status,
    decimal SubtotalGBP,
    decimal VatGBP,
    decimal TotalGBP,
    string? LineItemsJson,
    Guid SubmittedByUserId,
    string? SubmittedByName,
    DateTime? SubmittedAt,
    DateTime? ExpiresAt,
    DateTime CreatedAt
);

