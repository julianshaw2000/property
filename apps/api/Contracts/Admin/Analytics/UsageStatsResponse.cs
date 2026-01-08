namespace MaintainUk.Api.Contracts.Admin.Analytics;

public record UsageStatsResponse(
    List<OrganisationUsageResponse> Organisations
);

public record OrganisationUsageResponse(
    Guid OrganisationId,
    string OrganisationName,
    string Plan,
    string Status,
    int TicketCount,
    int WorkOrderCount,
    int UserCount,
    int MaxUsers,
    int MaxTickets,
    long StorageUsedGb,
    long MaxStorageGb,
    int ApiCallCount,
    int MaxApiCalls,
    DateTime CreatedAt,
    DateTime? LastActivityAt,
    bool ExceedsLimits
);

public record TopOrganisationsResponse(
    string Metric,
    List<TopOrganisationResponse> Organisations
);

public record TopOrganisationResponse(
    Guid OrganisationId,
    string OrganisationName,
    string Plan,
    string MetricName,
    int MetricValue
);
