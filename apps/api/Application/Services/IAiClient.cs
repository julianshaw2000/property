using System.Text.Json;

namespace MaintainUk.Api.Application.Services;

public enum AiFeatureKey
{
    Intake,
    QuoteReview,
    CommsDraft,
    JobSummary
}

public sealed record AiResult(
    JsonElement Output,
    int TokensIn,
    int TokensOut,
    decimal Confidence
);

public interface IAiClient
{
    Task<AiResult> ExecuteAsync(
        AiFeatureKey feature,
        string systemPrompt,
        object userPayload,
        CancellationToken cancellationToken = default);
}

