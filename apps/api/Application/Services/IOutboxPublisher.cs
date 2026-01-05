namespace MaintainUk.Api.Application.Services;

public interface IOutboxPublisher
{
    Task PublishEmailAsync(Guid orgId, string type, object payload, DateTime? availableAt = null);
    Task PublishSmsAsync(Guid orgId, string type, object payload, DateTime? availableAt = null);
    Task PublishAiJobAsync(Guid orgId, string type, object payload, DateTime? availableAt = null);
    Task PublishGenericAsync(Guid orgId, string type, object payload, DateTime? availableAt = null);
}

