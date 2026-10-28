/// Même logique de message qu'humanizeApiError côté web (`lib/api.ts`) :
/// essaie `detail`, sinon concatène les erreurs de champ DRF.
class ApiException implements Exception {
  ApiException(this.statusCode, this.data) : message = _humanize(statusCode, data);

  final int? statusCode;
  final dynamic data;
  final String message;

  static String _humanize(int? status, dynamic data) {
    if (data is String && data.trim().isNotEmpty) {
      return data.length > 300 ? data.substring(0, 300) : data;
    }
    if (data is Map) {
      final detail = data['detail'];
      if (detail is String) return detail;
      final parts = <String>[];
      data.forEach((key, value) {
        final text = value is List ? value.whereType<String>().join(' ') : value.toString();
        if (text.isEmpty) return;
        parts.add(key == 'non_field_errors' ? text : '$key : $text');
      });
      if (parts.isNotEmpty) return parts.join(' · ');
    }
    return 'Erreur ${status ?? ''}'.trim();
  }

  @override
  String toString() => message;
}
