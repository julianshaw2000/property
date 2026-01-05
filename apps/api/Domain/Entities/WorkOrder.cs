using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Work order linked to maintenance ticket
/// </summary>
public class WorkOrder : BaseEntity
{
    public Guid TicketId { get; set; }
    public string WorkOrderNumber { get; set; } = string.Empty;
    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.Draft;
    public string? Description { get; set; }
    public Guid? AssignedContractorId { get; set; }
    public DateTime? ScheduledStartDate { get; set; }
    public DateTime? ScheduledEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public MaintenanceTicket Ticket { get; set; } = null!;
    public User? AssignedContractor { get; set; }
    public ICollection<Quote> Quotes { get; set; } = new List<Quote>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}

