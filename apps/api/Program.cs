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
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Domain.Enums;
using MaintainUk.Api.Infrastructure.Extensions;
using MaintainUk.Api.Infrastructure.Persistence;
using MaintainUk.Api.Infrastructure.Security;

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
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// HTTP Context for multi-tenancy
builder.Services.AddHttpContextAccessor();

// Auth services
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<AuthService>();

// Business services
builder.Services.AddScoped<TicketService>();
builder.Services.AddScoped<WorkOrderService>();
builder.Services.AddScoped<QuoteService>();
builder.Services.AddScoped<InvoiceService>();

// Outbox publisher
builder.Services.AddScoped<IOutboxPublisher, MaintainUk.Api.Infrastructure.Services.OutboxPublisher>();

// JWT Authentication
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

builder.Services.AddAuthorization();

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

// Health check endpoint
app.MapGet("/health", () => new
{
    status = "Healthy",
    timestamp = DateTime.UtcNow
})
.WithName("HealthCheck")
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

app.Run();

