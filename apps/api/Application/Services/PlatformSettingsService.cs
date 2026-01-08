using System.Text.Json;
using MaintainUk.Api.Contracts.Admin.Platform;
using MaintainUk.Api.Domain.Entities;
using MaintainUk.Api.Infrastructure.Persistence;

namespace MaintainUk.Api.Application.Services;

public class PlatformSettingsService
{
    private const string SettingsKey = "platform.settings";

    private readonly MaintainUkDbContext _context;
    private readonly AuditLogService _auditLogService;

    public PlatformSettingsService(
        MaintainUkDbContext context,
        AuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<PlatformSettingsDto> GetAsync()
    {
        var existing = await _context.PlatformSettings.FindAsync(SettingsKey);
        if (existing == null)
        {
            var defaults = CreateDefaultSettings();

            var entity = new PlatformSetting
            {
                Key = SettingsKey,
                Value = JsonSerializer.Serialize(defaults),
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = null
            };

            _context.PlatformSettings.Add(entity);
            await _context.SaveChangesAsync();

            return defaults;
        }

        try
        {
            var dto = JsonSerializer.Deserialize<PlatformSettingsDto>(existing.Value);
            return dto ?? CreateDefaultSettings();
        }
        catch
        {
            return CreateDefaultSettings();
        }
    }

    public async Task<PlatformSettingsDto> UpdateAsync(PlatformSettingsDto incoming, Guid userId)
    {
        var entity = await _context.PlatformSettings.FindAsync(SettingsKey);
        PlatformSettingsDto current;

        if (entity == null)
        {
            current = CreateDefaultSettings();
            entity = new PlatformSetting
            {
                Key = SettingsKey,
                Value = JsonSerializer.Serialize(current),
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = userId
            };
            _context.PlatformSettings.Add(entity);
        }
        else
        {
            current = JsonSerializer.Deserialize<PlatformSettingsDto>(entity.Value) ?? CreateDefaultSettings();
        }

        // Optimistic concurrency based on SettingsVersion
        if (incoming.SettingsVersion != current.SettingsVersion)
        {
            throw new InvalidOperationException("Platform settings have been modified by another user. Please reload and try again.");
        }

        // Apply validation rules and normalisation
        ApplyValidation(incoming);

        // Increment version
        incoming.SettingsVersion = current.SettingsVersion + 1;

        // Compute diff for audit
        var diff = ComputeDiff(current, incoming);

        entity.Value = JsonSerializer.Serialize(incoming);
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        // Audit
        if (diff.ChangedKeys.Any())
        {
            await _auditLogService.LogAsync(
                orgId: Guid.Empty, // Platform-wide
                userId: userId,
                action: "PLATFORM_SETTINGS_UPDATE",
                entityType: "PlatformSettings",
                entityId: Guid.Empty,
                changes: new
                {
                    diff.ChangedKeys,
                    diff.OldValues,
                    diff.NewValues
                });
        }

        return incoming;
    }

    private static PlatformSettingsDto CreateDefaultSettings()
    {
        return new PlatformSettingsDto
        {
            SettingsVersion = 0,

            // Simple, safe defaults – can be tuned later
            MaxPropertiesPerOrg = 100,
            MaxUsersPerOrg = 50,
            MaxActiveJobsPerMonth = 1000,
            DefaultApprovalThresholdGbp = 500m,
            MaxApprovalThresholdGbp = 5000m,
            SlaEmergencyHours = 4,
            SlaUrgentHours = 24,
            SlaRoutineDays = 7,

            BillingEnabled = false,
            TrialDays = 14,
            NonpaymentGraceDays = 14,
            HardStopOnNonpayment = false,
            VatEnabled = false,
            VatRatePercent = 0m,
            AllowedBillingModels = new[] { "PER_PROPERTY", "PER_JOB", "FLAT_MONTHLY" },

            ChannelEmailEnabled = true,
            ChannelSmsEnabled = false,
            ChannelWhatsappEnabled = false,
            CommsQuietHoursStartLocal = new TimeSpan(22, 0, 0),
            CommsQuietHoursEndLocal = new TimeSpan(7, 0, 0),
            RateLimitMessagesPerOrgPerDay = 1000,
            RateLimitMessagesPerUserPerHour = 60,
            TemplatesLocked = false,

            AutoAssignmentEnabled = false,
            RequireApprovalAboveGbp = 1000m,
            AllowCancelAfterAssigned = true,

            ContractorOnboardingMode = "INVITE_ONLY",
            ContractorInsuranceRequired = true,
            ContractorCertificationsRequired = false,
            ContractorVisibilityMode = "ORG_ONLY",

            AiEnabled = false,
            AiTenantPortalEnabled = false,
            AiWorkAssistEnabled = false,
            AiSummarisationEnabled = false,
            AiRequestsPerOrgPerDay = 0,
            AiTokensPerOrgPerMonth = 0,
            AiConfidenceThreshold = 0.8m,
            AiKillSwitch = false,

            GdprRetentionMonths = 24,
            AuditRetentionMonths = 24,
            MfaRequired = false,
            SessionExpiryMinutes = 30,

            FeatureFlags = new Dictionary<string, bool>(),
            RolloutMode = "ALL",
            RolloutPercent = null,
            RolloutAllowlistOrgIds = Array.Empty<string>(),

            PlatformName = "MaintainUK",
            SupportEmail = string.Empty,
            TermsUrl = string.Empty,
            PrivacyUrl = string.Empty,
            GlobalBannerMessage = null,
            MaintenanceMode = false,
            ReadOnlyMode = false
        };
    }

    private static void ApplyValidation(PlatformSettingsDto settings)
    {
        // Relationship between thresholds
        if (settings.MaxApprovalThresholdGbp < settings.DefaultApprovalThresholdGbp)
        {
            throw new InvalidOperationException("Max approval threshold must be greater than or equal to default approval threshold.");
        }

        // Counts and durations > 0 where applicable
        if (settings.MaxPropertiesPerOrg <= 0 ||
            settings.MaxUsersPerOrg <= 0 ||
            settings.MaxActiveJobsPerMonth <= 0)
        {
            throw new InvalidOperationException("Organisation limits must be greater than zero.");
        }

        if (settings.SlaEmergencyHours <= 0 ||
            settings.SlaUrgentHours <= 0 ||
            settings.SlaRoutineDays <= 0)
        {
            throw new InvalidOperationException("SLA durations must be greater than zero.");
        }

        if (settings.TrialDays < 0 ||
            settings.NonpaymentGraceDays < 0)
        {
            throw new InvalidOperationException("Trial and grace days cannot be negative.");
        }

        // VAT rules
        if (!settings.VatEnabled)
        {
            settings.VatRatePercent = 0m;
        }
        else
        {
            if (settings.VatRatePercent <= 0m || settings.VatRatePercent > 30m)
            {
                throw new InvalidOperationException("VAT rate must be between 0 and 30 when VAT is enabled.");
            }
        }

        // Quiet hours – start != end (overnight ranges allowed)
        if (settings.CommsQuietHoursStartLocal == settings.CommsQuietHoursEndLocal)
        {
            throw new InvalidOperationException("Quiet hours start and end must differ.");
        }

        // AI confidence threshold between 0 and 1 inclusive
        if (settings.AiConfidenceThreshold < 0m || settings.AiConfidenceThreshold > 1m)
        {
            throw new InvalidOperationException("AI confidence threshold must be between 0 and 1.");
        }

        // Rollout rules
        if (settings.RolloutMode == "PERCENT")
        {
            if (settings.RolloutPercent is null or < 0 or > 100)
            {
                throw new InvalidOperationException("Rollout percent must be between 0 and 100 when rollout mode is PERCENT.");
            }
        }

        if (settings.RolloutMode == "ALLOWLIST")
        {
            if (settings.RolloutAllowlistOrgIds == null || settings.RolloutAllowlistOrgIds.Length == 0)
            {
                throw new InvalidOperationException("Rollout allowlist must contain at least one organisation ID when rollout mode is ALLOWLIST.");
            }
        }

        // AI kill switch
        if (settings.AiKillSwitch)
        {
            settings.AiEnabled = false;
            settings.AiTenantPortalEnabled = false;
            settings.AiWorkAssistEnabled = false;
            settings.AiSummarisationEnabled = false;
        }
    }

    private static (List<string> ChangedKeys, Dictionary<string, object?> OldValues, Dictionary<string, object?> NewValues)
        ComputeDiff(PlatformSettingsDto before, PlatformSettingsDto after)
    {
        var changed = new List<string>();
        var oldValues = new Dictionary<string, object?>();
        var newValues = new Dictionary<string, object?>();

        void Check<T>(string key, T oldValue, T newValue)
        {
            if (!Equals(oldValue, newValue))
            {
                changed.Add(key);
                oldValues[key] = oldValue;
                newValues[key] = newValue;
            }
        }

        Check(nameof(after.MaxPropertiesPerOrg), before.MaxPropertiesPerOrg, after.MaxPropertiesPerOrg);
        Check(nameof(after.MaxUsersPerOrg), before.MaxUsersPerOrg, after.MaxUsersPerOrg);
        Check(nameof(after.MaxActiveJobsPerMonth), before.MaxActiveJobsPerMonth, after.MaxActiveJobsPerMonth);
        Check(nameof(after.DefaultApprovalThresholdGbp), before.DefaultApprovalThresholdGbp, after.DefaultApprovalThresholdGbp);
        Check(nameof(after.MaxApprovalThresholdGbp), before.MaxApprovalThresholdGbp, after.MaxApprovalThresholdGbp);
        Check(nameof(after.SlaEmergencyHours), before.SlaEmergencyHours, after.SlaEmergencyHours);
        Check(nameof(after.SlaUrgentHours), before.SlaUrgentHours, after.SlaUrgentHours);
        Check(nameof(after.SlaRoutineDays), before.SlaRoutineDays, after.SlaRoutineDays);

        Check(nameof(after.BillingEnabled), before.BillingEnabled, after.BillingEnabled);
        Check(nameof(after.TrialDays), before.TrialDays, after.TrialDays);
        Check(nameof(after.NonpaymentGraceDays), before.NonpaymentGraceDays, after.NonpaymentGraceDays);
        Check(nameof(after.HardStopOnNonpayment), before.HardStopOnNonpayment, after.HardStopOnNonpayment);
        Check(nameof(after.VatEnabled), before.VatEnabled, after.VatEnabled);
        Check(nameof(after.VatRatePercent), before.VatRatePercent, after.VatRatePercent);

        Check(nameof(after.ChannelEmailEnabled), before.ChannelEmailEnabled, after.ChannelEmailEnabled);
        Check(nameof(after.ChannelSmsEnabled), before.ChannelSmsEnabled, after.ChannelSmsEnabled);
        Check(nameof(after.ChannelWhatsappEnabled), before.ChannelWhatsappEnabled, after.ChannelWhatsappEnabled);
        Check(nameof(after.CommsQuietHoursStartLocal), before.CommsQuietHoursStartLocal, after.CommsQuietHoursStartLocal);
        Check(nameof(after.CommsQuietHoursEndLocal), before.CommsQuietHoursEndLocal, after.CommsQuietHoursEndLocal);
        Check(nameof(after.RateLimitMessagesPerOrgPerDay), before.RateLimitMessagesPerOrgPerDay, after.RateLimitMessagesPerOrgPerDay);
        Check(nameof(after.RateLimitMessagesPerUserPerHour), before.RateLimitMessagesPerUserPerHour, after.RateLimitMessagesPerUserPerHour);
        Check(nameof(after.TemplatesLocked), before.TemplatesLocked, after.TemplatesLocked);

        Check(nameof(after.AutoAssignmentEnabled), before.AutoAssignmentEnabled, after.AutoAssignmentEnabled);
        Check(nameof(after.RequireApprovalAboveGbp), before.RequireApprovalAboveGbp, after.RequireApprovalAboveGbp);
        Check(nameof(after.AllowCancelAfterAssigned), before.AllowCancelAfterAssigned, after.AllowCancelAfterAssigned);

        Check(nameof(after.ContractorOnboardingMode), before.ContractorOnboardingMode, after.ContractorOnboardingMode);
        Check(nameof(after.ContractorInsuranceRequired), before.ContractorInsuranceRequired, after.ContractorInsuranceRequired);
        Check(nameof(after.ContractorCertificationsRequired), before.ContractorCertificationsRequired, after.ContractorCertificationsRequired);
        Check(nameof(after.ContractorVisibilityMode), before.ContractorVisibilityMode, after.ContractorVisibilityMode);

        Check(nameof(after.AiEnabled), before.AiEnabled, after.AiEnabled);
        Check(nameof(after.AiTenantPortalEnabled), before.AiTenantPortalEnabled, after.AiTenantPortalEnabled);
        Check(nameof(after.AiWorkAssistEnabled), before.AiWorkAssistEnabled, after.AiWorkAssistEnabled);
        Check(nameof(after.AiSummarisationEnabled), before.AiSummarisationEnabled, after.AiSummarisationEnabled);
        Check(nameof(after.AiRequestsPerOrgPerDay), before.AiRequestsPerOrgPerDay, after.AiRequestsPerOrgPerDay);
        Check(nameof(after.AiTokensPerOrgPerMonth), before.AiTokensPerOrgPerMonth, after.AiTokensPerOrgPerMonth);
        Check(nameof(after.AiConfidenceThreshold), before.AiConfidenceThreshold, after.AiConfidenceThreshold);
        Check(nameof(after.AiKillSwitch), before.AiKillSwitch, after.AiKillSwitch);

        Check(nameof(after.GdprRetentionMonths), before.GdprRetentionMonths, after.GdprRetentionMonths);
        Check(nameof(after.AuditRetentionMonths), before.AuditRetentionMonths, after.AuditRetentionMonths);
        Check(nameof(after.MfaRequired), before.MfaRequired, after.MfaRequired);
        Check(nameof(after.SessionExpiryMinutes), before.SessionExpiryMinutes, after.SessionExpiryMinutes);

        Check(nameof(after.RolloutMode), before.RolloutMode, after.RolloutMode);
        Check(nameof(after.RolloutPercent), before.RolloutPercent, after.RolloutPercent);

        Check(nameof(after.PlatformName), before.PlatformName, after.PlatformName);
        Check(nameof(after.SupportEmail), before.SupportEmail, after.SupportEmail);
        Check(nameof(after.TermsUrl), before.TermsUrl, after.TermsUrl);
        Check(nameof(after.PrivacyUrl), before.PrivacyUrl, after.PrivacyUrl);
        Check(nameof(after.GlobalBannerMessage), before.GlobalBannerMessage, after.GlobalBannerMessage);
        Check(nameof(after.MaintenanceMode), before.MaintenanceMode, after.MaintenanceMode);
        Check(nameof(after.ReadOnlyMode), before.ReadOnlyMode, after.ReadOnlyMode);

        // Collections and dictionaries – log as whole objects if changed
        if (!Enumerable.SequenceEqual(before.AllowedBillingModels, after.AllowedBillingModels))
        {
            const string key = nameof(PlatformSettingsDto.AllowedBillingModels);
            changed.Add(key);
            oldValues[key] = before.AllowedBillingModels;
            newValues[key] = after.AllowedBillingModels;
        }

        if (!Enumerable.SequenceEqual(before.RolloutAllowlistOrgIds, after.RolloutAllowlistOrgIds))
        {
            const string key = nameof(PlatformSettingsDto.RolloutAllowlistOrgIds);
            changed.Add(key);
            oldValues[key] = before.RolloutAllowlistOrgIds;
            newValues[key] = after.RolloutAllowlistOrgIds;
        }

        if (!before.FeatureFlags.OrderBy(kv => kv.Key).SequenceEqual(after.FeatureFlags.OrderBy(kv => kv.Key)))
        {
            const string key = nameof(PlatformSettingsDto.FeatureFlags);
            changed.Add(key);
            oldValues[key] = before.FeatureFlags;
            newValues[key] = after.FeatureFlags;
        }

        return (changed, oldValues, newValues);
    }
}

