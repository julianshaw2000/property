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

        // Apply global query filter for multi-tenancy
        ApplyMultiTenantQueryFilter(modelBuilder);
    }

    private void ConfigureOrganisation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organisation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Plan).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
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
        // Extract OrgId from JWT claims (will be implemented in Phase 3)
        // For now, return empty Guid (will be set explicitly in SaveChanges)
        var orgIdClaim = _httpContextAccessor?.HttpContext?.User?.FindFirst("orgId");
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

