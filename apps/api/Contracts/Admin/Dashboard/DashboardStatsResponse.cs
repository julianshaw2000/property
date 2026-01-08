namespace MaintainUk.Api.Contracts.Admin.Dashboard;

public record DashboardStatsResponse(
    int TotalOrganisations,
    int ActiveOrganisations,
    int SuspendedOrganisations,
    int TotalUsers,
    int ActiveUsers,
    double OrganisationGrowthPercent,
    double UserGrowthPercent,
    Dictionary<string, int> UsersByRole,
    Dictionary<string, int> OrganisationsByPlan
);
