using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;
using MaintainUk.Api.Infrastructure.Security;
using Moq;
using Xunit;
using SubscriptionPlanEnum = MaintainUk.Api.Domain.Enums.SubscriptionPlan;

namespace MaintainUk.Api.Tests.Application.Services;

public class UserManagementServiceTests
{
    private readonly MaintainUkDbContext _context;
    private readonly Mock<IPasswordHasher> _mockPasswordHasher;
    private readonly Mock<AuditLogService> _mockAuditLog;
    private readonly Mock<IOutboxPublisher> _mockOutboxPublisher;
    private readonly UserManagementService _service;

    public UserManagementServiceTests()
    {
        var options = new DbContextOptionsBuilder<MaintainUkDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _context = new MaintainUkDbContext(options);

        _mockPasswordHasher = new Mock<IPasswordHasher>();
        _mockPasswordHasher
            .Setup(x => x.HashPassword(It.IsAny<string>()))
            .Returns("hashed_password");

        _mockAuditLog = new Mock<AuditLogService>(_context, mockHttpContextAccessor.Object);

        _mockOutboxPublisher = new Mock<IOutboxPublisher>();

        _service = new UserManagementService(
            _context,
            _mockPasswordHasher.Object,
            _mockAuditLog.Object,
            _mockOutboxPublisher.Object);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_PrimaryAdmin_ThrowsException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var primaryAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "primary@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        org.PrimaryAdminUserId = primaryAdmin.Id;

        _context.Organisations.Add(org);
        _context.Users.Add(primaryAdmin);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.UpdateUserRoleAsync(
            primaryAdmin.Id,
            org.Id,
            UserRole.Coordinator.ToString(),
            Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Primary Admin*");
    }

    [Fact]
    public async Task UpdateUserRoleAsync_LastOrgAdmin_ThrowsException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var lastAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "lastadmin@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.Add(lastAdmin);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.UpdateUserRoleAsync(
            lastAdmin.Id,
            org.Id,
            UserRole.Viewer.ToString(),
            Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*last*OrgAdmin*");
    }

    [Fact]
    public async Task UpdateUserRoleAsync_ValidChange_UpdatesRole()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var admin1 = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "admin1@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        var admin2 = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "admin2@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.AddRange(admin1, admin2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UpdateUserRoleAsync(
            admin2.Id,
            org.Id,
            UserRole.Coordinator.ToString(),
            Guid.NewGuid());

        // Assert
        result.Should().NotBeNull();
        result!.Role.Should().Be(UserRole.Coordinator);
    }

    [Fact]
    public async Task DeactivateUserAsync_PrimaryAdmin_ThrowsException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var primaryAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "primary@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        org.PrimaryAdminUserId = primaryAdmin.Id;

        _context.Organisations.Add(org);
        _context.Users.Add(primaryAdmin);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.DeactivateUserAsync(
            primaryAdmin.Id,
            org.Id,
            Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Primary Admin*");
    }

    [Fact]
    public async Task DeactivateUserAsync_LastOrgAdmin_ThrowsException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var lastAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "lastadmin@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.Add(lastAdmin);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.DeactivateUserAsync(
            lastAdmin.Id,
            org.Id,
            Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*last*OrgAdmin*");
    }

    [Fact]
    public async Task DeactivateUserAsync_ValidUser_Deactivates()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var admin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "admin@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        var coordinator = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "coord@test.com",
            Role = UserRole.Coordinator,
            IsActive = true,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.AddRange(admin, coordinator);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeactivateUserAsync(
            coordinator.Id,
            org.Id,
            Guid.NewGuid());

        // Assert
        result.Should().BeTrue();
        var deactivatedUser = await _context.Users.FindAsync(coordinator.Id);
        deactivatedUser!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task SetPrimaryAdminAsync_NonOrgAdmin_ThrowsException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var coordinator = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "coord@test.com",
            Role = UserRole.Coordinator,
            IsActive = true,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.Add(coordinator);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.SetPrimaryAdminAsync(
            org.Id,
            coordinator.Id,
            Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*OrgAdmin role*");
    }

    [Fact]
    public async Task SetPrimaryAdminAsync_InactiveUser_ThrowsException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var inactiveAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "inactive@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = false,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.Add(inactiveAdmin);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.SetPrimaryAdminAsync(
            org.Id,
            inactiveAdmin.Id,
            Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*inactive*");
    }

    [Fact]
    public async Task SetPrimaryAdminAsync_ValidOrgAdmin_SetsPrimaryAdmin()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var newPrimaryAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "newprimary@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.Add(newPrimaryAdmin);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.SetPrimaryAdminAsync(
            org.Id,
            newPrimaryAdmin.Id,
            Guid.NewGuid());

        // Assert
        result.Should().BeTrue();
        var updatedOrg = await _context.Organisations.FindAsync(org.Id);
        updatedOrg!.PrimaryAdminUserId.Should().Be(newPrimaryAdmin.Id);
    }

    [Fact]
    public async Task CreateUserAsync_SuperAdminRole_ThrowsUnauthorizedException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        _context.Organisations.Add(org);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.CreateUserAsync(
            email: "superadmin@test.com",
            role: UserRole.SuperAdmin.ToString(),
            orgId: org.Id,
            createdByUserId: Guid.NewGuid(),
            password: "password123");

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*SuperAdmin*");
    }

    [Fact]
    public async Task CreateUserAsync_DuplicateEmail_ThrowsException()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "existing@test.com",
            Role = UserRole.Coordinator,
            IsActive = true,
            PasswordHash = "hash"
        };

        _context.Organisations.Add(org);
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        // Act
        Func<Task> act = async () => await _service.CreateUserAsync(
            email: "existing@test.com",
            role: UserRole.Coordinator.ToString(),
            orgId: org.Id,
            createdByUserId: Guid.NewGuid(),
            password: "password123");

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task CreateUserAsync_ValidUser_CreatesUser()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            Slug = "test-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var existingAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "admin@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        org.PrimaryAdminUserId = existingAdmin.Id;

        _context.Organisations.Add(org);
        _context.Users.Add(existingAdmin);
        await _context.SaveChangesAsync();

        // Act - create a non-first user; role should be respected
        var result = await _service.CreateUserAsync(
            email: "newuser@test.com",
            role: UserRole.Coordinator.ToString(),
            orgId: org.Id,
            createdByUserId: Guid.NewGuid(),
            firstName: "John",
            lastName: "Doe",
            password: "password123",
            sendInviteEmail: false);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be("newuser@test.com");
        result.Role.Should().Be(UserRole.Coordinator);
        result.FirstName.Should().Be("John");
        result.LastName.Should().Be("Doe");
        result.IsActive.Should().BeTrue();
        result.PasswordHash.Should().Be("hashed_password");
    }

    [Fact]
    public async Task CreateUserAsync_FirstUserInOrg_IsPromotedToOrgAdminAndPrimaryAdminIsSet()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "First User Org",
            Slug = "first-user-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        _context.Organisations.Add(org);
        await _context.SaveChangesAsync();

        var creatorUserId = Guid.NewGuid();

        // Act
        var result = await _service.CreateUserAsync(
            email: "first@test.com",
            role: UserRole.Coordinator.ToString(), // request non-admin
            orgId: org.Id,
            createdByUserId: creatorUserId,
            firstName: "First",
            lastName: "User",
            password: "password123",
            sendInviteEmail: false);

        // Assert
        result.Should().NotBeNull();
        result.Role.Should().Be(UserRole.OrgAdmin); // auto-promoted

        var updatedOrg = await _context.Organisations.FindAsync(org.Id);
        updatedOrg!.PrimaryAdminUserId.Should().Be(result.Id);
    }

    [Fact]
    public async Task CreateUserAsync_SubsequentUsers_DoNotChangePrimaryAdmin()
    {
        // Arrange
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Existing Org",
            Slug = "existing-org",
            Plan = SubscriptionPlanEnum.Free,
            Status = OrganisationStatus.Active
        };

        var firstAdmin = new User
        {
            Id = Guid.NewGuid(),
            OrgId = org.Id,
            Email = "admin@test.com",
            Role = UserRole.OrgAdmin,
            IsActive = true,
            PasswordHash = "hash"
        };

        org.PrimaryAdminUserId = firstAdmin.Id;

        _context.Organisations.Add(org);
        _context.Users.Add(firstAdmin);
        await _context.SaveChangesAsync();

        var creatorUserId = Guid.NewGuid();

        // Act
        var secondUser = await _service.CreateUserAsync(
            email: "second@test.com",
            role: UserRole.Coordinator.ToString(),
            orgId: org.Id,
            createdByUserId: creatorUserId,
            firstName: "Second",
            lastName: "User",
            password: "password123",
            sendInviteEmail: false);

        // Assert
        secondUser.Role.Should().Be(UserRole.Coordinator);

        var updatedOrg = await _context.Organisations.FindAsync(org.Id);
        updatedOrg!.PrimaryAdminUserId.Should().Be(firstAdmin.Id);
    }
}
