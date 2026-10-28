/// Reflète `DocumentSerializer` (`apps/documents/serializers.py`) — version
/// allégée, sans les règles de visibilité/signatures (gestion avancée,
/// hors périmètre de ce premier jet mobile).
class HubDocument {
  HubDocument({
    required this.id,
    required this.title,
    required this.description,
    required this.isInLibrary,
    required this.visibility,
    this.folderName,
    this.ownerEmail,
    this.currentVersionFilename,
    this.currentVersionSize,
    this.updatedAt,
  });

  factory HubDocument.fromJson(Map<String, dynamic> json) {
    final version = json['current_version_detail'] as Map<String, dynamic>?;
    return HubDocument(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      isInLibrary: json['is_in_library'] as bool? ?? false,
      visibility: json['visibility'] as String? ?? 'public',
      folderName: json['folder_name'] as String?,
      ownerEmail: json['owner_email'] as String?,
      currentVersionFilename: version?['original_filename'] as String?,
      currentVersionSize: version?['size'] as int?,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at'] as String) : null,
    );
  }

  final int id;
  final String title;
  final String description;
  final bool isInLibrary;
  final String visibility;
  final String? folderName;
  final String? ownerEmail;
  final String? currentVersionFilename;
  final int? currentVersionSize;
  final DateTime? updatedAt;

  String get sizeLabel {
    final bytes = currentVersionSize;
    if (bytes == null) return '';
    if (bytes < 1024) return '$bytes o';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} Ko';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} Mo';
  }
}

/// Reflète `ReceivedDocumentSerializer`.
class ReceivedDocument {
  ReceivedDocument({
    required this.recipientId,
    required this.documentId,
    required this.title,
    required this.isRead,
    this.description,
    this.sentByEmail,
    this.message,
    this.sentAt,
  });

  factory ReceivedDocument.fromJson(Map<String, dynamic> json) {
    return ReceivedDocument(
      recipientId: json['id'] as int,
      documentId: json['document_id'] as int,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      sentByEmail: json['sent_by_email'] as String?,
      message: json['message'] as String?,
      sentAt: json['sent_at'] != null ? DateTime.tryParse(json['sent_at'] as String) : null,
    );
  }

  final int recipientId;
  final int documentId;
  final String title;
  final String? description;
  final bool isRead;
  final String? sentByEmail;
  final String? message;
  final DateTime? sentAt;
}
