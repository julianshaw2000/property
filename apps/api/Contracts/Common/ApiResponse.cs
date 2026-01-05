namespace MaintainUk.Api.Contracts.Common;

public record ApiResponse<T>(
    T? Data,
    ApiError? Error,
    string TraceId
);

public record ApiError(
    string Code,
    string Message,
    Dictionary<string, string[]>? Details = null
);

