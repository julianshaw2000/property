using MaintainUk.Api.Domain.Entities;

namespace MaintainUk.Api.Application.Services;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    Guid? ValidateAccessToken(string token);
}

