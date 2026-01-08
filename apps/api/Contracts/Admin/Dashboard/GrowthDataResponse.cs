namespace MaintainUk.Api.Contracts.Admin.Dashboard;

public record GrowthDataResponse(
    List<GrowthDataPointResponse> DataPoints
);

public record GrowthDataPointResponse(
    DateTime Date,
    int OrganisationSignups,
    int UserRegistrations
);
