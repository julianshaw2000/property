namespace MaintainUk.Api.Contracts.Admin.Dashboard;

public record ActivityFeedResponse(
    List<ActivityItemResponse> Activities
);

public record ActivityItemResponse(
    string Type,
    string Description,
    DateTime Timestamp,
    string EntityId,
    Dictionary<string, string> Metadata
);
