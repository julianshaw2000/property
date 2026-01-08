using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Infrastructure.Extensions;

namespace MaintainUk.Api.Infrastructure.Middleware;

public class PlatformModeMiddleware
{
    private readonly RequestDelegate _next;

    public PlatformModeMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, PlatformSettingsService settingsService)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var method = context.Request.Method;

        // Allow auth, health, and platform settings endpoints to always pass through
        var isAuthOrHealth = path.StartsWith("/api/v1/auth", StringComparison.OrdinalIgnoreCase)
                             || path.Equals("/health", StringComparison.OrdinalIgnoreCase)
                             || path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase);

        var isPlatformSettings = path.StartsWith("/api/platform-settings", StringComparison.OrdinalIgnoreCase);

        if (!isAuthOrHealth && !isPlatformSettings)
        {
          var settings = await settingsService.GetAsync();
          var user = context.User;
          var isSuperAdmin = user?.Identity?.IsAuthenticated == true && user.IsSuperAdmin();

          if (settings.MaintenanceMode && !isSuperAdmin)
          {
              context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
              await context.Response.WriteAsJsonAsync(new
              {
                  error = "maintenance_mode",
                  message = "The platform is currently under maintenance. Please try again later."
              });
              return;
          }

          if (settings.ReadOnlyMode && !isSuperAdmin
              && (HttpMethods.IsPost(method)
                  || HttpMethods.IsPut(method)
                  || HttpMethods.IsPatch(method)
                  || HttpMethods.IsDelete(method)))
          {
              context.Response.StatusCode = StatusCodes.Status423Locked;
              await context.Response.WriteAsJsonAsync(new
              {
                  error = "read_only_mode",
                  message = "The platform is currently in read-only mode. Write operations are temporarily disabled."
              });
              return;
          }
        }

        await _next(context);
    }
}

