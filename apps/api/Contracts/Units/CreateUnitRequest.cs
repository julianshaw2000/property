namespace MaintainUk.Api.Contracts.Units;

public record CreateUnitRequest(
    Guid PropertyId,
    string UnitNumber,
    string Name,
    int? Bedrooms,
    int? Bathrooms
);
