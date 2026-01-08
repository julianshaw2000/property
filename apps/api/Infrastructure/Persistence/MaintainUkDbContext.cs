using Microsoft.EntityFrameworkCore;
using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Entities;

namespace MaintainUk.Api.Infrastructure.Persistence;

public class MaintainUkDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public MaintainUkDbContext(DbContextOptions<MaintainUkDbContext> options)
        : base(options)
    {
    }

    public MaintainUkDbContext(
        DbContextOptions<MaintainUkDbContext> options,
        IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    // DbSets
    public DbSet<Organisation> Organisations => Set<Organisation>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<MaintenanceTicket> MaintenanceTickets => Set<MaintenanceTicket>();
    public DbSet<TicketTimelineEvent> TicketTimelineEvents => Set<TicketTimelineEvent>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<ContactPoint> ContactPoints => Set<ContactPoint>();
    public DbSet<ConsentRecord> ConsentRecords => Set<ConsentRecord>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    // New admin expansion DbSets
    public DbSet<Domain.Entities.SubscriptionPlan> SubscriptionPlans => Set<Domain.Entities.SubscriptionPlan>();
    public DbSet<FeatureFlag> FeatureFlags => Set<FeatureFlag>();
    public DbSet<FeatureFlagOverride> FeatureFlagOverrides => Set<FeatureFlagOverride>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<Webhook> Webhooks => Set<Webhook>();
    public DbSet<PlatformSetting> PlatformSettings => Set<PlatformSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations
        ConfigureOrganisation(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureRefreshToken(modelBuilder);
        ConfigureProperty(modelBuilder);
        ConfigureUnit(modelBuilder);
        ConfigureMaintenanceTicket(modelBuilder);
        ConfigureTicketTimelineEvent(modelBuilder);
        ConfigureWorkOrder(modelBuilder);
        ConfigureQuote(modelBuilder);
        ConfigureInvoice(modelBuilder);
        ConfigurePayment(modelBuilder);
        ConfigureConversation(modelBuilder);
        ConfigureMessage(modelBuilder);
        ConfigureContactPoint(modelBuilder);
        ConfigureConsentRecord(modelBuilder);
        ConfigureAuditLog(modelBuilder);
        ConfigureNotification(modelBuilder);
        ConfigureOutboxMessage(modelBuilder);

        // Configure new admin expansion entities
        ConfigureSubscriptionPlan(modelBuilder);
        ConfigureFeatureFlag(modelBuilder);
        ConfigureFeatureFlagOverride(modelBuilder);
        ConfigureApiKey(modelBuilder);
        ConfigureWebhook(modelBuilder);
        ConfigurePlatformSetting(modelBuilder);

        // Apply global query filter for multi-tenancy
        ApplyMultiTenantQueryFilter(modelBuilder);
    }

    private void ConfigureOrganisation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organisation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.PlanId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.LastActivityAt);

            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Plan).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.BillingCycle).HasMaxLength(20);
            entity.Property(e => e.BrandingPrimaryColor).HasMaxLength(50);
            entity.Property(e => e.Timezone).HasMaxLength(100);
            entity.Property(e => e.Locale).HasMaxLength(20);

            // Configure PrimaryAdmin relationship
            entity.HasOne(e => e.PrimaryAdmin)
                  .WithMany()
                  .HasForeignKey(e => e.PrimaryAdminUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Configure SubscriptionPlan relationship
            entity.HasOne(e => e.SubscriptionPlan)
                  .WithMany(p => p.Organisations)
                  .HasForeignKey(e => e.PlanId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Email, e.OrgId }).IsUnique();
            entity.HasIndex(e => e.OrgId);
            entity.Property(e => e.Email).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Role).HasConversion<string>().HasMaxLength(50);
            entity.HasOne(e => e.Organisation)
                  .WithMany(o => o.Users)
                  .HasForeignKey(e => e.OrgId);
        });
    }

    private void ConfigureRefreshToken(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.Token).HasMaxLength(200).IsRequired();
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId);
        });
    }

    private void ConfigureProperty(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Property>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.Postcode);
            entity.Property(e => e.AddressLine1).HasMaxLength(200).IsRequired();
            entity.Property(e => e.City).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Postcode).HasMaxLength(10).IsRequired();
            entity.HasOne(e => e.Organisation)
                  .WithMany(o => o.Properties)
                  .HasForeignKey(e => e.OrgId);
        });
    }

    private void ConfigureUnit(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Unit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.PropertyId);

            entity.Property(e => e.UnitNumber).HasMaxLength(50);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Ignore(e => e.Number); // Computed property

            entity.HasOne(e => e.Property)
                  .WithMany(p => p.Units)
                  .HasForeignKey(e => e.PropertyId);
        });
    }

    private void ConfigureMaintenanceTicket(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MaintenanceTicket>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TicketNumber, e.OrgId }).IsUnique();
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.UnitId);
            entity.HasIndex(e => new { e.Status, e.Priority });
            entity.HasIndex(e => e.AssignedToUserId);
            entity.HasIndex(e => e.CreatedAt);

            entity.Property(e => e.TicketNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Priority).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.ReportedByName).HasMaxLength(200);
            entity.Property(e => e.ReportedByPhone).HasMaxLength(50);
            entity.Property(e => e.ReportedByEmail).HasMaxLength(200);

            entity.HasOne(e => e.Unit)
                  .WithMany(u => u.Tickets)
                  .HasForeignKey(e => e.UnitId);

            entity.HasOne(e => e.AssignedToUser)
                  .WithMany()
                  .HasForeignKey(e => e.AssignedToUserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureTicketTimelineEvent(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TicketTimelineEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => new { e.TicketId, e.CreatedAt });
            entity.HasIndex(e => e.ActorUserId);

            entity.Property(e => e.EventType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasOne(e => e.Ticket)
                  .WithMany(t => t.TimelineEvents)
                  .HasForeignKey(e => e.TicketId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ActorUser)
                  .WithMany()
                  .HasForeignKey(e => e.ActorUserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureWorkOrder(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.WorkOrderNumber, e.OrgId }).IsUnique();
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.TicketId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.AssignedContractorId);

            entity.Property(e => e.WorkOrderNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);

            entity.HasOne(e => e.Ticket)
                  .WithMany()
                  .HasForeignKey(e => e.TicketId);

            entity.HasOne(e => e.AssignedContractor)
                  .WithMany()
                  .HasForeignKey(e => e.AssignedContractorId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureQuote(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Quote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.QuoteNumber, e.OrgId }).IsUnique();
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.Status);

            entity.Property(e => e.QuoteNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.TotalGBP).HasPrecision(10, 2);
            entity.Property(e => e.SubtotalGBP).HasPrecision(10, 2);
            entity.Property(e => e.VatGBP).HasPrecision(10, 2);

            entity.HasOne(e => e.WorkOrder)
                  .WithMany(w => w.Quotes)
                  .HasForeignKey(e => e.WorkOrderId);

            entity.HasOne(e => e.SubmittedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.SubmittedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ReviewedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.ReviewedByUserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureInvoice(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.InvoiceNumber, e.OrgId }).IsUnique();
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.Status);

            entity.Property(e => e.InvoiceNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.TotalGBP).HasPrecision(10, 2);
            entity.Property(e => e.SubtotalGBP).HasPrecision(10, 2);
            entity.Property(e => e.VatGBP).HasPrecision(10, 2);
            entity.Property(e => e.FileKey).HasMaxLength(500);

            entity.HasOne(e => e.WorkOrder)
                  .WithMany(w => w.Invoices)
                  .HasForeignKey(e => e.WorkOrderId);

            entity.HasOne(e => e.SubmittedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.SubmittedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.ApprovedByUserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigurePayment(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.InvoiceId);
            entity.HasIndex(e => e.PaidAt);

            entity.Property(e => e.AmountGBP).HasPrecision(10, 2);
            entity.Property(e => e.Method).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.TransactionReference).HasMaxLength(200);

            entity.HasOne(e => e.Invoice)
                  .WithMany(i => i.Payments)
                  .HasForeignKey(e => e.InvoiceId);
        });
    }

    private void ConfigureConversation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.TicketId);

            entity.Property(e => e.Subject).HasMaxLength(200);

            entity.HasOne(e => e.Ticket)
                  .WithMany()
                  .HasForeignKey(e => e.TicketId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureMessage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.FromUserId);
            entity.HasIndex(e => new { e.Status, e.CreatedAt });

            entity.Property(e => e.Channel).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.ExternalMessageId).HasMaxLength(200);

            entity.HasOne(e => e.Conversation)
                  .WithMany(c => c.Messages)
                  .HasForeignKey(e => e.ConversationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.FromUser)
                  .WithMany()
                  .HasForeignKey(e => e.FromUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ToContactPoint)
                  .WithMany()
                  .HasForeignKey(e => e.ToContactPointId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureContactPoint(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ContactPoint>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.Type, e.Value, e.OrgId }).IsUnique();

            entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Value).HasMaxLength(200).IsRequired();

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId);
        });
    }

    private void ConfigureConsentRecord(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConsentRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.ContactPointId);
            entity.HasIndex(e => new { e.ContactPointId, e.ConsentType });

            entity.Property(e => e.ConsentType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);

            entity.HasOne(e => e.ContactPoint)
                  .WithMany(c => c.ConsentRecords)
                  .HasForeignKey(e => e.ContactPointId);
        });
    }

    private void ConfigureAuditLog(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
            entity.HasIndex(e => e.CreatedAt);

            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private void ConfigureNotification(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.IsRead, e.CreatedAt });

            entity.Property(e => e.Type).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ActionUrl).HasMaxLength(500);

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId);
        });
    }

    private void ConfigureOutboxMessage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Status, e.AvailableAt });
            entity.HasIndex(e => e.OrgId);
            entity.Property(e => e.Type).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
        });
    }

    private void ConfigureSubscriptionPlan(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Domain.Entities.SubscriptionPlan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.PriceMonthly).HasColumnType("decimal(10,2)");
            entity.Property(e => e.PriceAnnually).HasColumnType("decimal(10,2)");
            entity.Property(e => e.Features).HasColumnType("jsonb");
        });
    }

    private void ConfigureFeatureFlag(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FeatureFlag>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Key).IsUnique();
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Type).HasMaxLength(50).IsRequired();
            entity.Property(e => e.DefaultValue).HasMaxLength(1000).IsRequired();
        });
    }

    private void ConfigureFeatureFlagOverride(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FeatureFlagOverride>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.FlagId, e.OrgId }).IsUnique();

            entity.Property(e => e.Value).HasMaxLength(1000).IsRequired();

            entity.HasOne(e => e.Flag)
                  .WithMany(f => f.Overrides)
                  .HasForeignKey(e => e.FlagId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Organisation)
                  .WithMany(o => o.FeatureFlagOverrides)
                  .HasForeignKey(e => e.OrgId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ConfigureApiKey(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ApiKey>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);
            entity.HasIndex(e => e.KeyHash);

            entity.Property(e => e.KeyHash).HasMaxLength(500).IsRequired();
            entity.Property(e => e.KeyPreview).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200);

            entity.HasOne(e => e.Organisation)
                  .WithMany(o => o.ApiKeys)
                  .HasForeignKey(e => e.OrgId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CreatedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.CreatedBy)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ConfigureWebhook(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Webhook>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrgId);

            entity.Property(e => e.Url).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Events).HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.Secret).HasMaxLength(500).IsRequired();

            entity.HasOne(e => e.Organisation)
                  .WithMany(o => o.Webhooks)
                  .HasForeignKey(e => e.OrgId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ConfigurePlatformSetting(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PlatformSetting>(entity =>
        {
            entity.HasKey(e => e.Key);
            entity.Property(e => e.Key).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Value).HasColumnType("jsonb").IsRequired();

            entity.HasOne(e => e.UpdatedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.UpdatedBy)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private void ApplyMultiTenantQueryFilter(ModelBuilder modelBuilder)
    {
        // Apply global query filter to all entities that implement IHasOrgId
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(IHasOrgId).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(MaintainUkDbContext)
                    .GetMethod(nameof(ApplyQueryFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)?
                    .MakeGenericMethod(entityType.ClrType);

                method?.Invoke(null, new object[] { modelBuilder, this });
            }
        }
    }

    private static void ApplyQueryFilter<TEntity>(ModelBuilder modelBuilder, MaintainUkDbContext context)
        where TEntity : class, IHasOrgId
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            context._httpContextAccessor == null ||
            e.OrgId == context.GetCurrentOrgId());
    }

    private Guid GetCurrentOrgId()
    {
        var user = _httpContextAccessor?.HttpContext?.User;
        if (user == null)
        {
            return Guid.Empty;
        }

        // SuperAdmin bypasses org filter
        var roleClaim = user.FindFirst("role");
        if (roleClaim?.Value == "SuperAdmin")
        {
            return Guid.Empty; // Returns Empty = no filter applied
        }

        // Regular users: enforce org scoping
        var orgIdClaim = user.FindFirst("orgId");
        if (orgIdClaim != null && Guid.TryParse(orgIdClaim.Value, out var orgId))
        {
            return orgId;
        }
        return Guid.Empty;
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Set timestamps
        foreach (var entry in ChangeTracker.Entries<IHasTimestamps>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        // Set OrgId for new entities (if not already set)
        var currentOrgId = GetCurrentOrgId();
        if (currentOrgId != Guid.Empty)
        {
            foreach (var entry in ChangeTracker.Entries<IHasOrgId>())
            {
                if (entry.State == EntityState.Added && entry.Entity.OrgId == Guid.Empty)
                {
                    entry.Entity.OrgId = currentOrgId;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}

