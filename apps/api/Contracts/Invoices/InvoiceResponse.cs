using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Contracts.Invoices;

public record InvoiceResponse(
    Guid Id,
    string InvoiceNumber,
    Guid WorkOrderId,
    string WorkOrderNumber,
    InvoiceStatus Status,
    decimal SubtotalGBP,
    decimal VatGBP,
    decimal TotalGBP,
    string? FileKey,
    Guid SubmittedByUserId,
    string? SubmittedByName,
    DateTime? SubmittedAt,
    DateTime? DueDate,
    DateTime? PaidAt,
    DateTime CreatedAt
);

