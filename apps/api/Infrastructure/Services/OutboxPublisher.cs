using System.Text.Json;
using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Infrastructure.Services;

public class OutboxPublisher : IOutboxPublisher
{
    private readonly MaintainUkDbContext _context;

    public OutboxPublisher(MaintainUkDbContext context)
    {
        _context = context;
    }

    public async Task PublishEmailAsync(Guid orgId, string type, object payload, DateTime? availableAt = null)
    {
        await PublishAsync(orgId, $"email.{type}", payload, availableAt);
    }

    public async Task PublishSmsAsync(Guid orgId, string type, object payload, DateTime? availableAt = null)
    {
        await PublishAsync(orgId, $"sms.{type}", payload, availableAt);
    }

    public async Task PublishAiJobAsync(Guid orgId, string type, object payload, DateTime? availableAt = null)
    {
        await PublishAsync(orgId, $"ai.{type}", payload, availableAt);
    }

    public async Task PublishGenericAsync(Guid orgId, string type, object payload, DateTime? availableAt = null)
    {
        await PublishAsync(orgId, type, payload, availableAt);
    }

    private async Task PublishAsync(Guid orgId, string type, object payload, DateTime? availableAt)
    {
        var message = new OutboxMessage
        {
            OrgId = orgId,
            Type = type,
            PayloadJson = JsonSerializer.Serialize(payload),
            Status = "Pending",
            AvailableAt = availableAt ?? DateTime.UtcNow,
            Attempts = 0
        };

        _context.OutboxMessages.Add(message);
        await _context.SaveChangesAsync();
    }
}

