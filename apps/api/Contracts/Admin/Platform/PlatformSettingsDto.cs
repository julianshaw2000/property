namespace MaintainUk.Api.Contracts.Admin.Platform;

public class PlatformSettingsDto
{
    // Versioning
    public int SettingsVersion { get; set; }

    // A) Organisation limits & defaults
    public int MaxPropertiesPerOrg { get; set; }
    public int MaxUsersPerOrg { get; set; }
    public int MaxActiveJobsPerMonth { get; set; }
    public decimal DefaultApprovalThresholdGbp { get; set; }
    public decimal MaxApprovalThresholdGbp { get; set; }
    public int SlaEmergencyHours { get; set; }
    public int SlaUrgentHours { get; set; }
    public int SlaRoutineDays { get; set; }

    // B) Billing & monetisation controls
    public bool BillingEnabled { get; set; }
    public int TrialDays { get; set; }
    public int NonpaymentGraceDays { get; set; }
    public bool HardStopOnNonpayment { get; set; }
    public bool VatEnabled { get; set; }
    public decimal VatRatePercent { get; set; }
    public string[] AllowedBillingModels { get; set; } = Array.Empty<string>();

    // C) Communication channels
    public bool ChannelEmailEnabled { get; set; }
    public bool ChannelSmsEnabled { get; set; }
    public bool ChannelWhatsappEnabled { get; set; }
    public TimeSpan CommsQuietHoursStartLocal { get; set; }
    public TimeSpan CommsQuietHoursEndLocal { get; set; }
    public int RateLimitMessagesPerOrgPerDay { get; set; }
    public int RateLimitMessagesPerUserPerHour { get; set; }
    public bool TemplatesLocked { get; set; }

    // D) Workflow rules
    public bool AutoAssignmentEnabled { get; set; }
    public decimal RequireApprovalAboveGbp { get; set; }
    public bool AllowCancelAfterAssigned { get; set; }

    // E) Contractor governance
    public string ContractorOnboardingMode { get; set; } = "INVITE_ONLY";
    public bool ContractorInsuranceRequired { get; set; }
    public bool ContractorCertificationsRequired { get; set; }
    public string ContractorVisibilityMode { get; set; } = "ORG_ONLY";

    // F) AI controls
    public bool AiEnabled { get; set; }
    public bool AiTenantPortalEnabled { get; set; }
    public bool AiWorkAssistEnabled { get; set; }
    public bool AiSummarisationEnabled { get; set; }
    public int AiRequestsPerOrgPerDay { get; set; }
    public int AiTokensPerOrgPerMonth { get; set; }
    public decimal AiConfidenceThreshold { get; set; }
    public bool AiKillSwitch { get; set; }

    // G) Compliance & security
    public int GdprRetentionMonths { get; set; }
    public int AuditRetentionMonths { get; set; }
    public bool MfaRequired { get; set; }
    public int SessionExpiryMinutes { get; set; }

    // H) Feature flags
    public Dictionary<string, bool> FeatureFlags { get; set; } = new();
    public string RolloutMode { get; set; } = "ALL";
    public int? RolloutPercent { get; set; }
    public string[] RolloutAllowlistOrgIds { get; set; } = Array.Empty<string>();

    // I) Platform identity
    public string PlatformName { get; set; } = "MaintainUK";
    public string SupportEmail { get; set; } = string.Empty;
    public string TermsUrl { get; set; } = string.Empty;
    public string PrivacyUrl { get; set; } = string.Empty;
    public string? GlobalBannerMessage { get; set; }
    public bool MaintenanceMode { get; set; }
    public bool ReadOnlyMode { get; set; }
}

