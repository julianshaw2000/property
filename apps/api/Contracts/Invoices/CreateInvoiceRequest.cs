namespace MaintainUk.Api.Contracts.Invoices;

public record CreateInvoiceRequest(
    Guid WorkOrderId,
    string InvoiceNumber,
    decimal SubtotalGBP,
    decimal VatGBP,
    decimal TotalGBP,
    string? LineItemsJson,
    string? FileKey,
    DateTime? DueDate,
    string? Notes
);

