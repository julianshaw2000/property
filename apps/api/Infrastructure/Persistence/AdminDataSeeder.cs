using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Entities;

namespace MaintainUk.Api.Infrastructure.Persistence;

public class AdminDataSeeder
{
    private readonly MaintainUkDbContext _context;

    public AdminDataSeeder(MaintainUkDbContext context)
    {
        _context = context;
    }

    public async Task SeedAsync()
    {
        await SeedSubscriptionPlansAsync();
        await SeedFeatureFlagsAsync();
    }

    private async Task SeedSubscriptionPlansAsync()
    {
        // Check if plans already exist
        if (await _context.SubscriptionPlans.AnyAsync())
        {
            return; // Already seeded
        }

        var plans = new List<Domain.Entities.SubscriptionPlan>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Free",
                Slug = "free",
                Description = "Free plan with basic features",
                PriceMonthly = 0,
                PriceAnnually = 0,
                MaxUsers = 2,
                MaxTickets = 50,
                MaxStorageGb = 1,
                MaxApiCalls = 1000,
                Features = new[]
                {
                    "Basic ticket management",
                    "Email notifications",
                    "Up to 2 users",
                    "1GB storage"
                },
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Starter",
                Slug = "starter",
                Description = "Starter plan for small teams",
                PriceMonthly = 29,
                PriceAnnually = 290,
                MaxUsers = 5,
                MaxTickets = 200,
                MaxStorageGb = 10,
                MaxApiCalls = 10000,
                Features = new[]
                {
                    "All Free features",
                    "SMS notifications",
                    "Up to 5 users",
                    "10GB storage",
                    "Priority support"
                },
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Professional",
                Slug = "professional",
                Description = "Professional plan for growing businesses",
                PriceMonthly = 99,
                PriceAnnually = 990,
                MaxUsers = 20,
                MaxTickets = 1000,
                MaxStorageGb = 50,
                MaxApiCalls = 50000,
                Features = new[]
                {
                    "All Starter features",
                    "WhatsApp notifications",
                    "AI triage",
                    "Up to 20 users",
                    "50GB storage",
                    "Custom branding",
                    "API access"
                },
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Enterprise",
                Slug = "enterprise",
                Description = "Enterprise plan with unlimited resources",
                PriceMonthly = null, // Contact sales
                PriceAnnually = null, // Contact sales
                MaxUsers = 0, // 0 = unlimited
                MaxTickets = 0, // 0 = unlimited
                MaxStorageGb = 0, // 0 = unlimited
                MaxApiCalls = 0, // 0 = unlimited
                Features = new[]
                {
                    "All Professional features",
                    "Unlimited users",
                    "Unlimited tickets",
                    "Unlimited storage",
                    "Dedicated support",
                    "Custom integrations",
                    "SLA guarantee",
                    "Advanced analytics"
                },
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        await _context.SubscriptionPlans.AddRangeAsync(plans);
        await _context.SaveChangesAsync();
    }

    private async Task SeedFeatureFlagsAsync()
    {
        // Check if feature flags already exist
        if (await _context.FeatureFlags.AnyAsync())
        {
            return; // Already seeded
        }

        var flags = new List<FeatureFlag>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Key = "ai_triage",
                Name = "AI Triage",
                Description = "Enable AI-powered ticket triage and categorization",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Key = "sms_notifications",
                Name = "SMS Notifications",
                Description = "Enable SMS notifications for ticket updates",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Key = "whatsapp_notifications",
                Name = "WhatsApp Notifications",
                Description = "Enable WhatsApp notifications for ticket updates",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Key = "custom_branding",
                Name = "Custom Branding",
                Description = "Enable custom logo and color branding",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Key = "api_access",
                Name = "API Access",
                Description = "Enable REST API access with API keys",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Key = "webhooks",
                Name = "Webhooks",
                Description = "Enable webhook subscriptions for events",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Key = "advanced_analytics",
                Name = "Advanced Analytics",
                Description = "Enable advanced analytics and reporting",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                Key = "mfa_enforcement",
                Name = "MFA Enforcement",
                Description = "Require multi-factor authentication for all users",
                Type = "boolean",
                DefaultValue = "false",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        await _context.FeatureFlags.AddRangeAsync(flags);
        await _context.SaveChangesAsync();
    }
}
