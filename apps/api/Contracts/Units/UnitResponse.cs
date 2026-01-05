namespace MaintainUk.Api.Contracts.Units;

public record UnitResponse(
    Guid Id,
    Guid PropertyId,
    string UnitNumber,
    string Name,
    int? Bedrooms,
    int? Bathrooms,
    string Status
);
