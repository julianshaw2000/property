using MaintainUk.Api.Domain.Common;
using MaintainUk.Api.Domain.Enums;

namespace MaintainUk.Api.Domain.Entities;

/// <summary>
/// Message in a conversation (DRAFT -> SENT flow)
/// </summary>
public class Message : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Guid FromUserId { get; set; }
    public Guid? ToContactPointId { get; set; }
    public MessageChannel Channel { get; set; } = MessageChannel.PORTAL;
    public MessageStatus Status { get; set; } = MessageStatus.DRAFT;
    public string Body { get; set; } = string.Empty;
    public string? AttachmentsJson { get; set; } // JSON array of {fileKey, fileName, mimeType}
    public DateTime? SentAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? ExternalMessageId { get; set; } // Twilio SID, email provider ID, etc
    public string? ErrorMessage { get; set; }

    // Navigation
    public Conversation Conversation { get; set; } = null!;
    public User FromUser { get; set; } = null!;
    public ContactPoint? ToContactPoint { get; set; }
}

