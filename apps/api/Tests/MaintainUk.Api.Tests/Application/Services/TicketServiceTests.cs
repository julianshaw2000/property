using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Contracts.Tickets;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Tests.Application.Services;

public class TicketServiceTests : IDisposable
{
    private readonly MaintainUkDbContext _context;
    private readonly TicketService _service;
    private readonly Guid _orgId = Guid.NewGuid();
    private readonly Guid _unitId = Guid.NewGuid();
    private readonly Guid _propertyId = Guid.NewGuid();

    public TicketServiceTests()
    {
        var options = new DbContextOptionsBuilder<MaintainUkDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new MaintainUkDbContext(options);
        _service = new TicketService(_context);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var org = new Organisation
        {
            Id = _orgId,
            Name = "Test Org",
            Slug = "test-org"
        };
        _context.Organisations.Add(org);

        var property = new Property
        {
            Id = _propertyId,
            OrgId = _orgId,
            AddressLine1 = "123 Test Street",
            City = "London",
            Postcode = "SW1A 1AA"
        };
        _context.Properties.Add(property);

        var unit = new Unit
        {
            Id = _unitId,
            OrgId = _orgId,
            PropertyId = _propertyId,
            UnitNumber = "1A",
            Name = "Flat 1A"
        };
        _context.Units.Add(unit);

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task CreateTicketAsync_ValidRequest_CreatesTicketWithTimeline()
    {
        // Arrange
        var request = new CreateTicketRequest(
            UnitId: _unitId,
            Category: TicketCategory.PLUMBING,
            Priority: TicketPriority.URGENT,
            Title: "Leaking tap",
            Description: "Kitchen tap is dripping",
            ReportedByName: "John Tenant",
            ReportedByPhone: "07123456789",
            ReportedByEmail: "john@example.com"
        );

        // Act
        var result = await _service.CreateTicketAsync(request, _orgId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Leaking tap");
        result.Category.Should().Be(TicketCategory.PLUMBING);
        result.Priority.Should().Be(TicketPriority.URGENT);
        result.Status.Should().Be(TicketStatus.Open);
        result.TicketNumber.Should().StartWith("TKT-");
        result.Timeline.Should().HaveCount(1);
        result.Timeline.First().EventType.Should().Be("ticket.created");
    }

    [Fact]
    public async Task CreateTicketAsync_InvalidUnitId_ThrowsException()
    {
        // Arrange
        var request = new CreateTicketRequest(
            UnitId: Guid.NewGuid(), // Non-existent unit
            Category: TicketCategory.ELECTRICAL,
            Priority: TicketPriority.ROUTINE,
            Title: "Socket not working",
            Description: null,
            ReportedByName: null,
            ReportedByPhone: null,
            ReportedByEmail: null
        );

        // Act
        var act = async () => await _service.CreateTicketAsync(request, _orgId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Unit not found");
    }

    [Fact]
    public async Task GetTicketDetailAsync_ExistingTicket_ReturnsTicketWithTimeline()
    {
        // Arrange
        var createRequest = new CreateTicketRequest(
            UnitId: _unitId,
            Category: TicketCategory.HEATING,
            Priority: TicketPriority.EMERGENCY,
            Title: "No heating",
            Description: "Boiler not working",
            ReportedByName: "Jane Tenant",
            ReportedByPhone: null,
            ReportedByEmail: null
        );
        var created = await _service.CreateTicketAsync(createRequest, _orgId);

        // Act
        var result = await _service.GetTicketDetailAsync(created.Id, _orgId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(created.Id);
        result.Title.Should().Be("No heating");
        result.Timeline.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetTicketDetailAsync_NonExistentTicket_ReturnsNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.GetTicketDetailAsync(nonExistentId, _orgId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetTicketDetailAsync_WrongOrgId_ReturnsNull()
    {
        // Arrange
        var createRequest = new CreateTicketRequest(
            UnitId: _unitId,
            Category: TicketCategory.GENERAL,
            Priority: TicketPriority.PLANNED,
            Title: "Annual inspection",
            Description: null,
            ReportedByName: null,
            ReportedByPhone: null,
            ReportedByEmail: null
        );
        var created = await _service.CreateTicketAsync(createRequest, _orgId);

        // Act
        var result = await _service.GetTicketDetailAsync(created.Id, Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task ListTicketsAsync_ReturnsTicketsForOrg()
    {
        // Arrange
        for (int i = 0; i < 3; i++)
        {
            var request = new CreateTicketRequest(
                UnitId: _unitId,
                Category: TicketCategory.PLUMBING,
                Priority: TicketPriority.ROUTINE,
                Title: $"Ticket {i + 1}",
                Description: null,
                ReportedByName: null,
                ReportedByPhone: null,
                ReportedByEmail: null
            );
            await _service.CreateTicketAsync(request, _orgId);
        }

        // Act
        var result = await _service.ListTicketsAsync(_orgId);

        // Assert
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task ListTicketsAsync_FilterByStatus_ReturnsFilteredTickets()
    {
        // Arrange
        var request = new CreateTicketRequest(
            UnitId: _unitId,
            Category: TicketCategory.ELECTRICAL,
            Priority: TicketPriority.URGENT,
            Title: "Electrical issue",
            Description: null,
            ReportedByName: null,
            ReportedByPhone: null,
            ReportedByEmail: null
        );
        await _service.CreateTicketAsync(request, _orgId);

        // Act
        var openTickets = await _service.ListTicketsAsync(_orgId, status: TicketStatus.Open);
        var closedTickets = await _service.ListTicketsAsync(_orgId, status: TicketStatus.CLOSED);

        // Assert
        openTickets.Should().HaveCountGreaterThan(0);
        closedTickets.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteTicketAsync_ExistingTicket_ReturnsTrue()
    {
        // Arrange
        var request = new CreateTicketRequest(
            UnitId: _unitId,
            Category: TicketCategory.PEST,
            Priority: TicketPriority.ROUTINE,
            Title: "Pest issue",
            Description: null,
            ReportedByName: null,
            ReportedByPhone: null,
            ReportedByEmail: null
        );
        var created = await _service.CreateTicketAsync(request, _orgId);

        // Act
        var result = await _service.DeleteTicketAsync(created.Id, _orgId);

        // Assert
        result.Should().BeTrue();
        var deleted = await _service.GetTicketDetailAsync(created.Id, _orgId);
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteTicketAsync_NonExistentTicket_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.DeleteTicketAsync(nonExistentId, _orgId);

        // Assert
        result.Should().BeFalse();
    }
}
