using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Contracts.Auth;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;
using MaintainUk.Api.Infrastructure.Security;
using Moq;
using Xunit;

namespace MaintainUk.Api.Tests.Application.Services;

public class AuthServiceTests
{
    private readonly MaintainUkDbContext _context;
    private readonly Mock<IPasswordHasher> _mockPasswordHasher;
    private readonly Mock<IJwtService> _mockJwtService;
    private readonly Mock<AuditLogService> _mockAuditLogService;
    private readonly AuthService _service;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<MaintainUkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        _context = new MaintainUkDbContext(options);

        _mockPasswordHasher = new Mock<IPasswordHasher>();
        _mockPasswordHasher
            .Setup(x => x.HashPassword(It.IsAny<string>()))
            .Returns("hashed_password");

        _mockJwtService = new Mock<IJwtService>();
        _mockJwtService
            .Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns("access_token");
        _mockJwtService
            .Setup(x => x.GenerateRefreshToken())
            .Returns("refresh_token");

        _mockAuditLogService = new Mock<AuditLogService>(_context, httpContextAccessor.Object);

        _service = new AuthService(
            _context,
            _mockPasswordHasher.Object,
            _mockJwtService.Object,
            _mockAuditLogService.Object);
    }

    [Fact]
    public async Task RegisterAsync_CreatesOrgAndUser_AsOrgAdminAndPrimaryAdmin()
    {
        // Arrange
        var request = new RegisterRequest(
            OrgName: "Test Org",
            Email: "owner@test.com",
            Password: "Password123!",
            FirstName: "Owner",
            LastName: "User");

        // Act
        var result = await _service.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();

        var org = await _context.Organisations.FirstOrDefaultAsync();
        org.Should().NotBeNull();
        var user = await _context.Users.FirstOrDefaultAsync();
        user.Should().NotBeNull();

        user!.Role.Should().Be(UserRole.OrgAdmin);
        org!.PrimaryAdminUserId.Should().Be(user.Id);
    }
}

