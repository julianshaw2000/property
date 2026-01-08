using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MaintainUk.Api.Application.Services;
using MaintainUk.Api.Contracts.Auth;
using MaintainUk.Api.Contracts.Common;
using MaintainUk.Api.Contracts.Tickets;
using MaintainUk.Api.Contracts.WorkOrders;
using MaintainUk.Api.Contracts.Quotes;
using MaintainUk.Api.Contracts.Invoices;
using MaintainUk.Api.Contracts.Units;
using MaintainUk.Api.Contracts.Admin.Organisations;
using MaintainUk.Api.Contracts.Admin.Users;
using MaintainUk.Api.Contracts.Admin.AuditLogs;
using MaintainUk.Api.Contracts.Admin.Dashboard;
using MaintainUk.Api.Contracts.Admin.Analytics;
using MaintainUk.Api.Contracts.Admin.Platform;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Extensions;
using MaintainUk.Api.Infrastructure.Persistence;
using MaintainUk.Api.Infrastructure.Security;
using MaintainUk.Api.Infrastructure.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure JSON options to use camelCase (matches Angular frontend)
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    // Allow string enum conversion (e.g., "PLUMBING" or "Plumbing" both work)
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

// Database
builder.Services.AddDbContext<MaintainUkDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))
    .EnableSensitiveDataLogging(builder.Environment.IsDevelopment()));

// Enable dynamic JSON for Npgsql (required for string[] and other dynamic types in JSONB columns)
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
Npgsql.NpgsqlConnection.GlobalTypeMapper.EnableDynamicJson();

// HTTP Context for multi-tenancy
builder.Services.AddHttpContextAccessor();

// Auth services
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<AuthService>();

// Memory cache for performance
builder.Services.AddMemoryCache();

// Business services
builder.Services.AddScoped<TicketService>();
builder.Services.AddScoped<WorkOrderService>();
builder.Services.AddScoped<QuoteService>();
builder.Services.AddScoped<InvoiceService>();

// Admin services
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<OrganisationService>();
builder.Services.AddScoped<UserManagementService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<PlatformSettingsService>();

// Outbox publisher
builder.Services.AddScoped<IOutboxPublisher, MaintainUk.Api.Infrastructure.Services.OutboxPublisher>();
builder.Services.AddScoped<IAiClient, MaintainUk.Api.Infrastructure.Services.MockAiClient>();

// JWT Authentication
// Clear default claim type mappings to use short claim names from JWT
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "your-super-secret-jwt-key-change-this-in-production-minimum-32-characters-required";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// Authorization policies
builder.Services.AddAuthorization(options =>
{
    // SuperAdmin-only operations
    options.AddPolicy("RequireSuperAdmin", policy =>
        policy.RequireClaim(ClaimTypes.Role, UserRole.SuperAdmin.ToString()));

    // OrgAdmin or higher (SuperAdmin or OrgAdmin)
    options.AddPolicy("RequireOrgAdmin", policy =>
        policy.RequireAssertion(context =>
        {
            var role = context.User.FindFirst(ClaimTypes.Role)?.Value;
            return role == UserRole.SuperAdmin.ToString() ||
                   role == UserRole.OrgAdmin.ToString();
        }));
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseMiddleware<PlatformModeMiddleware>();
app.UseAuthorization();

// Auth endpoints
app.MapPost("/api/v1/auth/register", async (RegisterRequest request, AuthService authService, ILogger<Program> logger) =>
{
    try
    {
        logger.LogInformation("Registration attempt for email: {Email}", request.Email);
        var result = await authService.RegisterAsync(request);
        if (result == null)
        {
            return Results.BadRequest(new ApiResponse<object>(
                null,
                new ApiError("USER_EXISTS", "User with this email already exists"),
                Guid.NewGuid().ToString()
            ));
        }

        return Results.Ok(new ApiResponse<AuthResponse>(
            result,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Registration failed for email: {Email}", request.Email);
        return Results.Problem(
            title: "Registration failed",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.WithName("Register")
.WithOpenApi();

app.MapPost("/api/v1/auth/login", async (LoginRequest request, AuthService authService) =>
{
    var result = await authService.LoginAsync(request);
    if (result == null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new ApiResponse<AuthResponse>(
        result,
        null,
        Guid.NewGuid().ToString()
    ));
})
.WithName("Login")
.WithOpenApi();

app.MapPost("/api/v1/auth/refresh", async (RefreshTokenRequest request, AuthService authService) =>
{
    var result = await authService.RefreshTokenAsync(request.RefreshToken);
    if (result == null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new ApiResponse<AuthResponse>(
        result,
        null,
        Guid.NewGuid().ToString()
    ));
})
.WithName("RefreshToken")
.WithOpenApi();

// Get current user information
app.MapGet("/api/v1/auth/me", async (
    HttpContext httpContext,
    MaintainUkDbContext context) =>
{
    try
    {
        var userId = httpContext.User.GetUserId();
        var user = await context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return Results.Unauthorized();
        }

        var response = new
        {
            userId = user.Id,
            orgId = user.OrgId,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            role = user.Role.ToString(),
            isActive = user.IsActive
        };

        return Results.Ok(new ApiResponse<object>(
            response,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get current user",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("GetCurrentUser")
.WithOpenApi();

// Health check endpoint
app.MapGet("/health", () => new
{
    status = "Healthy",
    timestamp = DateTime.UtcNow
})
.WithName("HealthCheck")
.WithOpenApi();

// DEBUG: Claims endpoint
app.MapGet("/api/v1/debug/claims", (HttpContext httpContext) =>
{
    var claims = httpContext.User.Claims.Select(c => new
    {
        type = c.Type,
        value = c.Value
    }).ToList();

    return Results.Ok(new
    {
        isAuthenticated = httpContext.User.Identity?.IsAuthenticated,
        authenticationType = httpContext.User.Identity?.AuthenticationType,
        claims = claims
    });
})
.RequireAuthorization()
.WithName("DebugClaims")
.WithOpenApi();

// API version endpoint
app.MapGet("/api/v1/version", () => new
{
    version = "1.0.0",
    environment = app.Environment.EnvironmentName,
    timestamp = DateTime.UtcNow
})
.WithName("Version")
.WithOpenApi();

// ========================================
// TICKETS API
// ========================================

// Create ticket
app.MapPost("/api/v1/tickets", async (
    CreateTicketRequest request,
    TicketService ticketService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var ticket = await ticketService.CreateTicketAsync(request, orgId);

        return Results.Ok(new ApiResponse<TicketDetailResponse>(
            ticket,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new ApiResponse<object>(
            null,
            new ApiError("INVALID_REQUEST", ex.Message),
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to create ticket",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("CreateTicket")
.WithOpenApi();

// List tickets
app.MapGet("/api/v1/tickets", async (
    TicketService ticketService,
    HttpContext httpContext,
    string? status,
    string? priority,
    int skip = 0,
    int take = 50) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();

        TicketStatus? statusEnum = null;
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<TicketStatus>(status, true, out var s))
        {
            statusEnum = s;
        }

        TicketPriority? priorityEnum = null;
        if (!string.IsNullOrEmpty(priority) && Enum.TryParse<TicketPriority>(priority, true, out var p))
        {
            priorityEnum = p;
        }

        var tickets = await ticketService.ListTicketsAsync(orgId, statusEnum, priorityEnum, skip, take);

        return Results.Ok(new ApiResponse<List<TicketResponse>>(
            tickets,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to list tickets",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("ListTickets")
.WithOpenApi();

// Get ticket detail
app.MapGet("/api/v1/tickets/{id}", async (
    Guid id,
    TicketService ticketService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var ticket = await ticketService.GetTicketDetailAsync(id, orgId);

        if (ticket == null)
        {
            return Results.NotFound(new ApiResponse<object>(
                null,
                new ApiError("NOT_FOUND", "Ticket not found"),
                Guid.NewGuid().ToString()
            ));
        }

        return Results.Ok(new ApiResponse<TicketDetailResponse>(
            ticket,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get ticket",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("GetTicket")
.WithOpenApi();

// Update ticket
app.MapPatch("/api/v1/tickets/{id}", async (
    Guid id,
    UpdateTicketRequest request,
    TicketService ticketService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var ticket = await ticketService.UpdateTicketAsync(id, request, orgId, userId);

        if (ticket == null)
        {
            return Results.NotFound(new ApiResponse<object>(
                null,
                new ApiError("NOT_FOUND", "Ticket not found"),
                Guid.NewGuid().ToString()
            ));
        }

        return Results.Ok(new ApiResponse<TicketDetailResponse>(
            ticket,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to update ticket",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("UpdateTicket")
.WithOpenApi();

// Delete ticket
app.MapDelete("/api/v1/tickets/{id}", async (
    Guid id,
    TicketService ticketService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var deleted = await ticketService.DeleteTicketAsync(id, orgId);

        if (!deleted)
        {
            return Results.NotFound(new ApiResponse<object>(
                null,
                new ApiError("NOT_FOUND", "Ticket not found"),
                Guid.NewGuid().ToString()
            ));
        }

        return Results.Ok(new ApiResponse<object>(
            new { message = "Ticket deleted successfully" },
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to delete ticket",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("DeleteTicket")
.WithOpenApi();

// ========================================
// WORK ORDERS API
// ========================================

app.MapPost("/api/v1/work-orders", async (
    CreateWorkOrderRequest request,
    WorkOrderService workOrderService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var workOrder = await workOrderService.CreateWorkOrderAsync(request, orgId);
        return Results.Ok(new ApiResponse<WorkOrderResponse>(workOrder, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to create work order", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("CreateWorkOrder")
.WithOpenApi();

app.MapGet("/api/v1/work-orders", async (
    WorkOrderService workOrderService,
    HttpContext httpContext,
    int skip = 0,
    int take = 50) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var workOrders = await workOrderService.ListWorkOrdersAsync(orgId, skip, take);
        return Results.Ok(new ApiResponse<List<WorkOrderResponse>>(workOrders, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to list work orders", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("ListWorkOrders")
.WithOpenApi();

app.MapGet("/api/v1/work-orders/{id}", async (
    Guid id,
    WorkOrderService workOrderService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var workOrder = await workOrderService.GetWorkOrderAsync(id, orgId);
        return Results.Ok(new ApiResponse<WorkOrderResponse>(workOrder, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to get work order", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("GetWorkOrder")
.WithOpenApi();

app.MapPatch("/api/v1/work-orders/{id}/assign", async (
    Guid id,
    AssignWorkOrderRequest request,
    WorkOrderService workOrderService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var workOrder = await workOrderService.AssignWorkOrderAsync(id, request.ContractorId, orgId, userId);
        if (workOrder == null) return Results.NotFound();
        return Results.Ok(new ApiResponse<WorkOrderResponse>(workOrder, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to assign work order", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("AssignWorkOrder")
.WithOpenApi();

app.MapPatch("/api/v1/work-orders/{id}/schedule", async (
    Guid id,
    ScheduleWorkOrderRequest request,
    WorkOrderService workOrderService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var workOrder = await workOrderService.ScheduleWorkOrderAsync(id, request, orgId, userId);
        if (workOrder == null) return Results.NotFound();
        return Results.Ok(new ApiResponse<WorkOrderResponse>(workOrder, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to schedule work order", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("ScheduleWorkOrder")
.WithOpenApi();

app.MapPost("/api/v1/work-orders/{id}/complete", async (
    Guid id,
    CompleteWorkOrderRequest request,
    WorkOrderService workOrderService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var workOrder = await workOrderService.CompleteWorkOrderAsync(id, request, orgId, userId);
        if (workOrder == null) return Results.NotFound();
        return Results.Ok(new ApiResponse<WorkOrderResponse>(workOrder, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to complete work order", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("CompleteWorkOrder")
.WithOpenApi();

// ========================================
// USERS API
// ========================================

app.MapGet("/api/v1/users", async (
    MaintainUkDbContext context,
    HttpContext httpContext,
    string? role) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();

        var query = context.Users.Where(u => u.OrgId == orgId);

        if (!string.IsNullOrEmpty(role))
        {
            query = query.Where(u => u.Role == Enum.Parse<UserRole>(role));
        }

        var users = await query
            .Select(u => new {
                id = u.Id,
                email = u.Email,
                firstName = u.FirstName,
                lastName = u.LastName,
                role = u.Role.ToString()
            })
            .ToListAsync();

        return Results.Ok(new ApiResponse<object>(users, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to list users", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("ListUsers")
.WithOpenApi();

// ========================================
// QUOTES API
// ========================================

app.MapPost("/api/v1/quotes", async (
    CreateQuoteRequest request,
    QuoteService quoteService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var quote = await quoteService.CreateQuoteAsync(request, orgId, userId);
        return Results.Ok(new ApiResponse<QuoteResponse>(quote, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to create quote", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("CreateQuote")
.WithOpenApi();

app.MapGet("/api/v1/quotes", async (
    QuoteService quoteService,
    HttpContext httpContext,
    int skip = 0,
    int take = 50) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var quotes = await quoteService.ListQuotesAsync(orgId, skip, take);
        return Results.Ok(new ApiResponse<List<QuoteResponse>>(quotes, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to list quotes", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("ListQuotes")
.WithOpenApi();

app.MapGet("/api/v1/quotes/{id}", async (
    Guid id,
    QuoteService quoteService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var quote = await quoteService.GetQuoteAsync(id, orgId);
        return Results.Ok(new ApiResponse<QuoteResponse>(quote, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to get quote", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("GetQuote")
.WithOpenApi();

app.MapPost("/api/v1/quotes/{id}/approve", async (
    Guid id,
    QuoteService quoteService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var quote = await quoteService.ApproveQuoteAsync(id, orgId, userId);
        if (quote == null) return Results.NotFound();
        return Results.Ok(new ApiResponse<QuoteResponse>(quote, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to approve quote", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("ApproveQuote")
.WithOpenApi();

app.MapPost("/api/v1/quotes/{id}/reject", async (
    Guid id,
    QuoteService quoteService,
    HttpContext httpContext,
    string? reason = null) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var quote = await quoteService.RejectQuoteAsync(id, reason, orgId, userId);
        if (quote == null) return Results.NotFound();
        return Results.Ok(new ApiResponse<QuoteResponse>(quote, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to reject quote", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("RejectQuote")
.WithOpenApi();

// ========================================
// INVOICES API
// ========================================

app.MapPost("/api/v1/invoices", async (
    CreateInvoiceRequest request,
    InvoiceService invoiceService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var invoice = await invoiceService.CreateInvoiceAsync(request, orgId, userId);
        return Results.Ok(new ApiResponse<InvoiceResponse>(invoice, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to create invoice", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("CreateInvoice")
.WithOpenApi();

app.MapGet("/api/v1/invoices", async (
    InvoiceService invoiceService,
    HttpContext httpContext,
    int skip = 0,
    int take = 50) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var invoices = await invoiceService.ListInvoicesAsync(orgId, skip, take);
        return Results.Ok(new ApiResponse<List<InvoiceResponse>>(invoices, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to list invoices", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("ListInvoices")
.WithOpenApi();

app.MapGet("/api/v1/invoices/{id}", async (
    Guid id,
    InvoiceService invoiceService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var invoice = await invoiceService.GetInvoiceAsync(id, orgId);
        return Results.Ok(new ApiResponse<InvoiceResponse>(invoice, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to get invoice", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("GetInvoice")
.WithOpenApi();

app.MapPost("/api/v1/invoices/{id}/approve", async (
    Guid id,
    InvoiceService invoiceService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var invoice = await invoiceService.ApproveInvoiceAsync(id, orgId, userId);
        if (invoice == null) return Results.NotFound();
        return Results.Ok(new ApiResponse<InvoiceResponse>(invoice, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to approve invoice", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("ApproveInvoice")
.WithOpenApi();

app.MapPost("/api/v1/invoices/{id}/mark-paid", async (
    Guid id,
    InvoiceService invoiceService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var invoice = await invoiceService.MarkPaidAsync(id, orgId, userId);
        if (invoice == null) return Results.NotFound();
        return Results.Ok(new ApiResponse<InvoiceResponse>(invoice, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to mark invoice as paid", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization()
.WithName("MarkInvoicePaid")
.WithOpenApi();

// ========================================
// UNITS API
// ========================================

// List units
app.MapGet("/api/v1/units", async (
    MaintainUkDbContext context,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();

        var units = await context.Units
            .Include(u => u.Property)
            .Where(u => u.OrgId == orgId)
            .Select(u => new
            {
                id = u.Id,
                propertyId = u.PropertyId,
                propertyAddress = u.Property.AddressLine1 + ", " + u.Property.City,
                unitNumber = u.UnitNumber,
                name = u.Name,
                bedrooms = u.Bedrooms,
                bathrooms = u.Bathrooms,
                status = u.Status
            })
            .ToListAsync();

        return Results.Ok(new ApiResponse<object>(
            units,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to list units",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("ListUnits")
.WithOpenApi();

// Create unit
app.MapPost("/api/v1/units", async (
    CreateUnitRequest request,
    MaintainUkDbContext context,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();

        var unit = new Unit
        {
            OrgId = orgId,
            PropertyId = request.PropertyId,
            UnitNumber = request.UnitNumber,
            Name = request.Name,
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            Status = "Available"
        };

        context.Units.Add(unit);
        await context.SaveChangesAsync();

        return Results.Ok(new ApiResponse<object>(
            new {
                id = unit.Id,
                propertyId = unit.PropertyId,
                unitNumber = unit.UnitNumber,
                name = unit.Name,
                bedrooms = unit.Bedrooms,
                bathrooms = unit.Bathrooms,
                status = unit.Status
            },
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to create unit",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization()
.WithName("CreateUnit")
.WithOpenApi();

// ========================================
// DEV ONLY - SEED TEST DATA
// ========================================

// Seed test data endpoint (Development only)
if (app.Environment.IsDevelopment())
{
    app.MapPost("/api/v1/dev/seed", async (
        MaintainUkDbContext context,
        HttpContext httpContext) =>
    {
        try
        {
            var orgId = httpContext.User.GetOrgId();

            // Create test property if none exists
            var existingProperty = await context.Properties
                .FirstOrDefaultAsync(p => p.OrgId == orgId);

            if (existingProperty == null)
            {
                var property = new Property
                {
                    OrgId = orgId,
                    AddressLine1 = "123 Demo Street",
                    City = "London",
                    Postcode = "SW1A 1AA",
                    Country = "UK",
                    PropertyType = "Residential",
                    Status = "Active"
                };

                context.Properties.Add(property);
                await context.SaveChangesAsync();
                existingProperty = property;
            }

            // Create test units if none exist for this property
            var existingUnits = await context.Units
                .Where(u => u.PropertyId == existingProperty.Id)
                .ToListAsync();

            if (existingUnits.Count == 0)
            {
                var units = new[]
                {
                    new Unit { OrgId = orgId, PropertyId = existingProperty.Id, UnitNumber = "101", Name = "Flat 101", Bedrooms = 2, Bathrooms = 1, Status = "Available" },
                    new Unit { OrgId = orgId, PropertyId = existingProperty.Id, UnitNumber = "102", Name = "Flat 102", Bedrooms = 3, Bathrooms = 2, Status = "Available" },
                    new Unit { OrgId = orgId, PropertyId = existingProperty.Id, UnitNumber = "201", Name = "Flat 201", Bedrooms = 2, Bathrooms = 1, Status = "Available" },
                    new Unit { OrgId = orgId, PropertyId = existingProperty.Id, UnitNumber = "202", Name = "Flat 202", Bedrooms = 1, Bathrooms = 1, Status = "Available" },
                    new Unit { OrgId = orgId, PropertyId = existingProperty.Id, UnitNumber = "301", Name = "Flat 301 (Penthouse)", Bedrooms = 3, Bathrooms = 2, Status = "Available" },
                };

                context.Units.AddRange(units);
                await context.SaveChangesAsync();
            }

            var unitCount = await context.Units.Where(u => u.OrgId == orgId).CountAsync();
            var propertyCount = await context.Properties.Where(p => p.OrgId == orgId).CountAsync();

            return Results.Ok(new ApiResponse<object>(
                new {
                    message = "Test data seeded successfully!",
                    propertiesCount = propertyCount,
                    unitsCount = unitCount,
                    propertyAddress = existingProperty.AddressLine1 + ", " + existingProperty.City
                },
                null,
                Guid.NewGuid().ToString()
            ));
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Failed to seed test data",
                detail: ex.Message,
                statusCode: 500
            );
        }
    })
    .RequireAuthorization()
    .WithName("SeedTestData")
    .WithOpenApi();
}

// ========================================
// SUPERADMIN - DASHBOARD & ANALYTICS
// ========================================

// Get dashboard statistics
app.MapGet("/api/v1/admin/dashboard/stats", async (DashboardService dashboardService) =>
{
    try
    {
        var stats = await dashboardService.GetDashboardStatsAsync();

        var response = new DashboardStatsResponse(
            stats.TotalOrganisations,
            stats.ActiveOrganisations,
            stats.SuspendedOrganisations,
            stats.TotalUsers,
            stats.ActiveUsers,
            stats.OrganisationGrowthPercent,
            stats.UserGrowthPercent,
            stats.UsersByRole,
            stats.OrganisationsByPlan
        );

        return Results.Ok(new ApiResponse<DashboardStatsResponse>(
            response,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get dashboard stats",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetDashboardStats")
.WithOpenApi();

// Get growth data for charts
app.MapGet("/api/v1/admin/dashboard/growth", async (
    DashboardService dashboardService,
    int days = 30) =>
{
    try
    {
        var growthData = await dashboardService.GetGrowthDataAsync(days);

        var dataPoints = growthData.Select(d => new GrowthDataPointResponse(
            d.Date,
            d.OrganisationSignups,
            d.UserRegistrations
        )).ToList();

        var response = new GrowthDataResponse(dataPoints);

        return Results.Ok(new ApiResponse<GrowthDataResponse>(
            response,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get growth data",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetGrowthData")
.WithOpenApi();

// Get recent activity feed
app.MapGet("/api/v1/admin/dashboard/activity", async (
    DashboardService dashboardService,
    int limit = 20) =>
{
    try
    {
        var activities = await dashboardService.GetRecentActivityAsync(limit);

        var activityItems = activities.Select(a => new ActivityItemResponse(
            a.Type,
            a.Description,
            a.Timestamp,
            a.EntityId,
            a.Metadata
        )).ToList();

        var response = new ActivityFeedResponse(activityItems);

        return Results.Ok(new ApiResponse<ActivityFeedResponse>(
            response,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get activity feed",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetActivityFeed")
.WithOpenApi();

// ========================================
// SUPERADMIN - ANALYTICS
// ========================================

app.MapGet("/api/v1/admin/analytics/usage", async (AnalyticsService analyticsService) =>
{
    try
    {
        var usage = await analyticsService.GetUsageStatsAsync();

        var response = new UsageStatsResponse(
            usage.Select(u => new OrganisationUsageResponse(
                u.OrganisationId,
                u.OrganisationName,
                u.Plan,
                u.Status,
                u.TicketCount,
                u.WorkOrderCount,
                u.UserCount,
                u.MaxUsers,
                u.MaxTickets,
                u.StorageUsedGb,
                u.MaxStorageGb,
                u.ApiCallCount,
                u.MaxApiCalls,
                u.CreatedAt,
                u.LastActivityAt,
                (u.MaxUsers > 0 && u.UserCount > u.MaxUsers) ||
                (u.MaxTickets > 0 && u.TicketCount > u.MaxTickets) ||
                (u.MaxStorageGb > 0 && u.StorageUsedGb > u.MaxStorageGb)
            )).ToList()
        );

        return Results.Ok(new ApiResponse<UsageStatsResponse>(
            response,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get usage statistics",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetUsageStats")
.WithOpenApi();

// ========================================
// SUPERADMIN - PLATFORM SETTINGS
// ========================================

app.MapGet("/api/platform-settings", async (
    PlatformSettingsService settingsService) =>
{
    var settings = await settingsService.GetAsync();
    return Results.Ok(new ApiResponse<PlatformSettingsDto>(settings, null, Guid.NewGuid().ToString()));
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetPlatformSettings")
.WithOpenApi();

app.MapPatch("/api/platform-settings", async (
    PlatformSettingsDto request,
    PlatformSettingsService settingsService,
    HttpContext httpContext) =>
{
    try
    {
        var userId = httpContext.User.GetUserId();
        var updated = await settingsService.UpdateAsync(request, userId);
        return Results.Ok(new ApiResponse<PlatformSettingsDto>(updated, null, Guid.NewGuid().ToString()));
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new ApiResponse<PlatformSettingsDto>(
            null,
            new ApiError("validation_error", ex.Message),
            Guid.NewGuid().ToString()));
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("UpdatePlatformSettings")
.WithOpenApi();

app.MapGet("/api/platform-settings/public", async (
    PlatformSettingsService settingsService) =>
{
    var settings = await settingsService.GetAsync();

    var @public = new
    {
        settings.MaxApprovalThresholdGbp,
        settings.ChannelEmailEnabled,
        settings.ChannelSmsEnabled,
        settings.ChannelWhatsappEnabled,
        settings.AiEnabled,
        settings.MaintenanceMode,
        settings.ReadOnlyMode
    };

    return Results.Ok(new ApiResponse<object>(@public, null, Guid.NewGuid().ToString()));
})
.WithName("GetPublicPlatformSettings")
.WithOpenApi();

app.MapGet("/api/v1/admin/analytics/top-organisations", async (
    AnalyticsService analyticsService,
    string metric = "tickets",
    int limit = 10) =>
{
    try
    {
        var topOrgs = await analyticsService.GetTopOrganisationsAsync(metric, limit);

        var response = new TopOrganisationsResponse(
            metric,
            topOrgs.Select(o => new TopOrganisationResponse(
                o.OrganisationId,
                o.OrganisationName,
                o.Plan,
                o.MetricName,
                o.MetricValue
            )).ToList()
        );

        return Results.Ok(new ApiResponse<TopOrganisationsResponse>(
            response,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get top organisations",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetTopOrganisations")
.WithOpenApi();

app.MapGet("/api/v1/admin/analytics/exceeding-limits", async (AnalyticsService analyticsService) =>
{
    try
    {
        var exceeding = await analyticsService.GetOrganisationsExceedingLimitsAsync();

        var response = new UsageStatsResponse(
            exceeding.Select(u => new OrganisationUsageResponse(
                u.OrganisationId,
                u.OrganisationName,
                u.Plan,
                u.Status,
                u.TicketCount,
                u.WorkOrderCount,
                u.UserCount,
                u.MaxUsers,
                u.MaxTickets,
                u.StorageUsedGb,
                u.MaxStorageGb,
                u.ApiCallCount,
                u.MaxApiCalls,
                u.CreatedAt,
                u.LastActivityAt,
                true
            )).ToList()
        );

        return Results.Ok(new ApiResponse<UsageStatsResponse>(
            response,
            null,
            Guid.NewGuid().ToString()
        ));
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Failed to get organisations exceeding limits",
            detail: ex.Message,
            statusCode: 500
        );
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetOrganisationsExceedingLimits")
.WithOpenApi();

// ========================================
// SUPERADMIN - ORGANISATION MANAGEMENT
// ========================================

app.MapGet("/api/v1/admin/organisations", async (
    OrganisationService orgService,
    int skip = 0,
    int take = 50,
    string? search = null,
    string? plan = null,
    string? status = null,
    DateTime? createdFrom = null,
    DateTime? createdTo = null) =>
{
    try
    {
        var orgs = await orgService.ListOrganisationsAsync(skip, take, search, plan, status, createdFrom, createdTo);
        var response = orgs.Select(o => new OrganisationResponse(
            o.Id,
            o.Name,
            o.Slug,
            o.Plan.ToString(),
            o.Status.ToString(),
            o.PrimaryAdminUserId,
            o.CreatedAt,
            o.Users.Count
        )).ToList();
        return Results.Ok(new ApiResponse<List<OrganisationResponse>>(response, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to list organisations", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("ListOrganisations")
.WithOpenApi();

app.MapGet("/api/v1/admin/organisations/{id}", async (
    Guid id,
    OrganisationService orgService) =>
{
    try
    {
        var org = await orgService.GetOrganisationAsync(id);
        if (org == null) return Results.NotFound();

        var response = new OrganisationDetailResponse(
            org.Id,
            org.Name,
            org.Slug,
            org.Plan.ToString(),
            org.Status.ToString(),
            org.PrimaryAdminUserId,
            org.PrimaryAdmin != null ? $"{org.PrimaryAdmin.FirstName} {org.PrimaryAdmin.LastName}" : null,
            org.CreatedAt,
            org.UpdatedAt,
            org.Users.Select(u => new UserSummary(
                u.Id,
                u.Email,
                u.Role.ToString(),
                $"{u.FirstName} {u.LastName}",
                u.IsActive
            )).ToList()
        );
        return Results.Ok(new ApiResponse<OrganisationDetailResponse>(response, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to get organisation", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("GetOrganisation")
.WithOpenApi();

app.MapPost("/api/v1/admin/organisations", async (
    CreateOrganisationRequest request,
    OrganisationService orgService,
    IPasswordHasher passwordHasher,
    HttpContext httpContext) =>
{
    try
    {
        var userId = httpContext.User.GetUserId();
        var org = await orgService.CreateOrganisationAsync(
            request.Name,
            request.Plan,
            userId,
            request.AdminEmail,
            request.AdminFirstName,
            request.AdminLastName,
            request.SendInviteEmail,
            request.AdminPassword,
            passwordHasher);
        var response = new OrganisationResponse(
            org.Id,
            org.Name,
            org.Slug,
            org.Plan.ToString(),
            org.Status.ToString(),
            org.PrimaryAdminUserId,
            org.CreatedAt,
            0
        );
        return Results.Ok(new ApiResponse<OrganisationResponse>(response, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to create organisation", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("CreateOrganisation")
.WithOpenApi();

app.MapPost("/api/v1/admin/organisations/{id}/suspend", async (
    Guid id,
    OrganisationService orgService,
    HttpContext httpContext) =>
{
    try
    {
        var userId = httpContext.User.GetUserId();
        var success = await orgService.SuspendOrganisationAsync(id, userId);
        if (!success) return Results.NotFound();
        return Results.Ok(new ApiResponse<object>(new { message = "Organisation suspended" }, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to suspend organisation", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("SuspendOrganisation")
.WithOpenApi();

app.MapPost("/api/v1/admin/organisations/{id}/reactivate", async (
    Guid id,
    OrganisationService orgService,
    HttpContext httpContext) =>
{
    try
    {
        var userId = httpContext.User.GetUserId();
        var success = await orgService.ReactivateOrganisationAsync(id, userId);
        if (!success) return Results.NotFound();
        return Results.Ok(new ApiResponse<object>(new { message = "Organisation reactivated" }, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to reactivate organisation", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireSuperAdmin")
.WithName("ReactivateOrganisation")
.WithOpenApi();

// ========================================
// ORG ADMIN - USER MANAGEMENT
// ========================================

app.MapGet("/api/v1/admin/users", async (
    UserManagementService userService,
    HttpContext httpContext,
    int skip = 0,
    int take = 50) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var users = await userService.ListUsersAsync(orgId, skip, take);
        var response = users.Select(u => new UserResponse(
            u.Id,
            u.Email,
            u.Role.ToString(),
            u.FirstName,
            u.LastName,
            u.IsActive,
            u.CreatedAt
        )).ToList();
        return Results.Ok(new ApiResponse<List<UserResponse>>(response, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to list users", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireOrgAdmin")
.WithName("AdminListUsers")
.WithOpenApi();

app.MapPost("/api/v1/admin/users", async (
    CreateUserRequest request,
    UserManagementService userService,
    HttpContext httpContext,
    Guid? orgId = null) =>
{
    try
    {
        // SuperAdmin can specify orgId via query parameter, others use their own
        var targetOrgId = orgId ?? httpContext.User.GetOrgId();
        if (!httpContext.User.IsSuperAdmin() && targetOrgId != httpContext.User.GetOrgId())
        {
            return Results.Forbid();
        }

        var userId = httpContext.User.GetUserId();
        var user = await userService.CreateUserAsync(
            request.Email,
            request.Role,
            targetOrgId,
            userId,
            request.FirstName,
            request.LastName,
            request.PhoneE164,
            request.Password,
            request.SendInviteEmail
        );
        var response = new UserResponse(
            user.Id,
            user.Email,
            user.Role.ToString(),
            user.FirstName,
            user.LastName,
            user.IsActive,
            user.CreatedAt
        );
        return Results.Ok(new ApiResponse<UserResponse>(response, null, Guid.NewGuid().ToString()));
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Forbid();
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new ApiResponse<object>(null, new ApiError("INVALID_REQUEST", ex.Message), Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to create user", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireOrgAdmin")
.WithName("CreateUser")
.WithOpenApi();

app.MapPatch("/api/v1/admin/users/{id}/role", async (
    Guid id,
    UpdateUserRoleRequest request,
    UserManagementService userService,
    HttpContext httpContext,
    Guid? orgId = null) =>
{
    try
    {
        // SuperAdmin can specify orgId via query parameter, others use their own
        var targetOrgId = orgId ?? httpContext.User.GetOrgId();
        if (!httpContext.User.IsSuperAdmin() && targetOrgId != httpContext.User.GetOrgId())
        {
            return Results.Forbid();
        }

        var userId = httpContext.User.GetUserId();
        var user = await userService.UpdateUserRoleAsync(id, targetOrgId, request.Role, userId);
        if (user == null) return Results.NotFound();
        var response = new UserResponse(
            user.Id,
            user.Email,
            user.Role.ToString(),
            user.FirstName,
            user.LastName,
            user.IsActive,
            user.CreatedAt
        );
        return Results.Ok(new ApiResponse<UserResponse>(response, null, Guid.NewGuid().ToString()));
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new ApiResponse<object>(null, new ApiError("VALIDATION_ERROR", ex.Message), Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to update user role", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireOrgAdmin")
.WithName("UpdateUserRole")
.WithOpenApi();

app.MapPost("/api/v1/admin/users/{id}/deactivate", async (
    Guid id,
    UserManagementService userService,
    HttpContext httpContext) =>
{
    try
    {
        var orgId = httpContext.User.GetOrgId();
        var userId = httpContext.User.GetUserId();
        var success = await userService.DeactivateUserAsync(id, orgId, userId);
        if (!success) return Results.NotFound();
        return Results.Ok(new ApiResponse<object>(new { message = "User deactivated" }, null, Guid.NewGuid().ToString()));
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new ApiResponse<object>(null, new ApiError("VALIDATION_ERROR", ex.Message), Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to deactivate user", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireOrgAdmin")
.WithName("DeactivateUser")
.WithOpenApi();

app.MapPost("/api/v1/admin/organisations/{orgId}/primary-admin", async (
    Guid orgId,
    SetPrimaryAdminRequest request,
    UserManagementService userService,
    HttpContext httpContext) =>
{
    try
    {
        var userId = httpContext.User.GetUserId();
        var success = await userService.SetPrimaryAdminAsync(orgId, request.UserId, userId);
        if (!success) return Results.NotFound();
        return Results.Ok(new ApiResponse<object>(new { message = "Primary admin updated" }, null, Guid.NewGuid().ToString()));
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new ApiResponse<object>(null, new ApiError("VALIDATION_ERROR", ex.Message), Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to set primary admin", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireOrgAdmin")
.WithName("SetPrimaryAdmin")
.WithOpenApi();

// ========================================
// AUDIT LOGS
// ========================================

app.MapGet("/api/v1/admin/audit-logs", async (
    AuditLogService auditService,
    HttpContext httpContext,
    int skip = 0,
    int take = 100) =>
{
    try
    {
        Guid? orgId = httpContext.User.IsSuperAdmin()
            ? null // SuperAdmin sees all orgs
            : httpContext.User.GetOrgId(); // OrgAdmin sees only their org

        var logs = await auditService.ListAuditLogsAsync(orgId, skip, take);
        var response = logs.Select(a => new AuditLogResponse(
            a.Id,
            a.OrgId,
            a.UserId,
            a.User.Email,
            a.Action,
            a.EntityType,
            a.EntityId,
            a.ChangesSummaryJson,
            a.IpAddress,
            a.CreatedAt
        )).ToList();
        return Results.Ok(new ApiResponse<List<AuditLogResponse>>(response, null, Guid.NewGuid().ToString()));
    }
    catch (Exception ex)
    {
        return Results.Problem(title: "Failed to list audit logs", detail: ex.Message, statusCode: 500);
    }
})
.RequireAuthorization("RequireOrgAdmin")
.WithName("ListAuditLogs")
.WithOpenApi();

// ========================================
// DATA SEEDING
// ========================================

// Check if --seed argument is passed
if (args.Contains("--seed"))
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MaintainUkDbContext>();
    var seeder = new AdminDataSeeder(context);

    Console.WriteLine("Seeding admin data (subscription plans and feature flags)...");
    await seeder.SeedAsync();
    Console.WriteLine("Admin data seeded successfully!");
}

// Seed richer admin E2E data (organisations, users, basic audit logs)
if (args.Contains("--seed-admin-e2e"))
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MaintainUkDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

    var e2eSeeder = new AdminE2eDataSeeder(context, passwordHasher);

    Console.WriteLine("Seeding admin E2E data (organisations, users, audit logs)...");
    await e2eSeeder.SeedAsync();
    Console.WriteLine("Admin E2E data seeded successfully!");
}

// Check if --update-superadmin argument is passed
if (args.Contains("--update-superadmin"))
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MaintainUkDbContext>();

    // Get email from next argument or use default
    var emailIndex = Array.IndexOf(args, "--update-superadmin") + 1;
    var email = emailIndex < args.Length ? args[emailIndex] : "julianshaw2000@gmail.com";

    Console.WriteLine($"Updating user to SuperAdmin: {email}");

    var user = await context.Users
        .IgnoreQueryFilters()
        .Include(u => u.Organisation)
        .FirstOrDefaultAsync(u => u.Email == email);

    if (user == null)
    {
        Console.WriteLine($"❌ User not found: {email}");
        return;
    }

    Console.WriteLine($"✓ Found user: {user.Email}");
    Console.WriteLine($"  Current role: {user.Role}");
    Console.WriteLine($"  Organisation: {user.Organisation.Name}");

    if (user.Role == UserRole.SuperAdmin)
    {
        Console.WriteLine("✓ User already has SuperAdmin role");
    }
    else
    {
        user.Role = UserRole.SuperAdmin;
        user.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        Console.WriteLine($"✅ Successfully updated {email} to SuperAdmin role");
    }

    return; // Exit after updating
}

app.Run();

