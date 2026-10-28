/// Reflète `ChannelSerializer` (`apps/messaging/serializers.py`).
class ChannelSummary {
  ChannelSummary({
    required this.id,
    required this.kind,
    required this.displayName,
    required this.memberCount,
    required this.unread,
    this.lastMessageBody,
    this.lastMessageAuthor,
    this.lastMessageAt,
  });

  factory ChannelSummary.fromJson(Map<String, dynamic> json) {
    final last = json['last_message'] as Map<String, dynamic>?;
    return ChannelSummary(
      id: json['id'] as int,
      kind: json['kind'] as String,
      displayName: json['display_name'] as String? ?? '',
      memberCount: json['member_count'] as int? ?? 0,
      unread: json['unread'] as int? ?? 0,
      lastMessageBody: last?['body'] as String?,
      lastMessageAuthor: last?['author_name'] as String?,
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.tryParse(json['last_message_at'] as String)
          : null,
    );
  }

  final int id;
  final String kind; // general | department | direct
  final String displayName;
  final int memberCount;
  final int unread;
  final String? lastMessageBody;
  final String? lastMessageAuthor;
  final DateTime? lastMessageAt;
}

/// Reflète `MessageSerializer`.
class ChatMessage {
  ChatMessage({
    required this.id,
    required this.channelId,
    required this.authorId,
    required this.authorName,
    required this.body,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as int,
      channelId: json['channel'] as int,
      authorId: json['author']?.toString(),
      authorName: json['author_name'] as String? ?? '',
      body: json['body'] as String? ?? '',
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final int id;
  final int channelId;
  final String? authorId;
  final String authorName;
  final String body;
  final DateTime createdAt;
}
