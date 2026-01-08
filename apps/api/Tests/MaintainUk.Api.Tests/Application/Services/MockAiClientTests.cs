using System.Text.Json;
using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Infrastructure.Services;
using Xunit;

namespace MaintainUk.Api.Tests.Application.Services;

public class MockAiClientTests
{
    private readonly IAiClient _client = new MockAiClient();

    [Theory]
    [InlineData(AiFeatureKey.Intake)]
    [InlineData(AiFeatureKey.QuoteReview)]
    [InlineData(AiFeatureKey.CommsDraft)]
    [InlineData(AiFeatureKey.JobSummary)]
    public async Task ExecuteAsync_Returns_Output_For_All_Features(AiFeatureKey feature)
    {
        // Act
        var result = await _client.ExecuteAsync(feature, "test-system-prompt", new { foo = "bar" });

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TokensIn > 0);
        Assert.True(result.TokensOut > 0);
        Assert.InRange(result.Confidence, 0m, 1m);

        // Ensure the output is valid JSON
        JsonElement output = result.Output;
        Assert.Equal(JsonValueKind.Object, output.ValueKind);
    }
}

