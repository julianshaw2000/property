using FluentAssertions;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Tests.Domain.Entities;

public class MaintenanceTicketTests
{
    [Fact]
    public void Constructor_SetsDefaultStatus_ToNew()
    {
        // Arrange & Act
        var ticket = new MaintenanceTicket();

        // Assert
        ticket.Status.Should().Be(TicketStatus.NEW);
    }

    [Fact]
    public void Constructor_GeneratesNewId()
    {
        // Arrange & Act
        var ticket = new MaintenanceTicket();

        // Assert
        ticket.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void Constructor_SetsCreatedAtToUtcNow()
    {
        // Arrange
        var before = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var ticket = new MaintenanceTicket();

        // Assert
        var after = DateTime.UtcNow.AddSeconds(1);
        ticket.CreatedAt.Should().BeAfter(before).And.BeBefore(after);
    }

    [Fact]
    public void TimelineEvents_InitializesAsEmptyCollection()
    {
        // Arrange & Act
        var ticket = new MaintenanceTicket();

        // Assert
        ticket.TimelineEvents.Should().NotBeNull();
        ticket.TimelineEvents.Should().BeEmpty();
    }

    [Theory]
    [InlineData(TicketPriority.EMERGENCY)]
    [InlineData(TicketPriority.URGENT)]
    [InlineData(TicketPriority.ROUTINE)]
    [InlineData(TicketPriority.PLANNED)]
    public void Priority_CanBeSetToAnyValue(TicketPriority priority)
    {
        // Arrange
        var ticket = new MaintenanceTicket();

        // Act
        ticket.Priority = priority;

        // Assert
        ticket.Priority.Should().Be(priority);
    }

    [Theory]
    [InlineData(TicketCategory.PLUMBING)]
    [InlineData(TicketCategory.ELECTRICAL)]
    [InlineData(TicketCategory.HEATING)]
    [InlineData(TicketCategory.STRUCTURAL)]
    public void Category_CanBeSetToAnyValue(TicketCategory category)
    {
        // Arrange
        var ticket = new MaintenanceTicket();

        // Act
        ticket.Category = category;

        // Assert
        ticket.Category.Should().Be(category);
    }
}
