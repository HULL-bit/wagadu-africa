/// Reflète la réponse de `DashboardView` (`apps/dashboard/views.py`) — son
/// contenu "s'enrichira à chaque phase" (commentaire du backend), donc
/// `widgets`/`shortcuts` restent en `Map`/`List` bruts plutôt que
/// strictement typés : on affiche ce qui est là sans casser si un nouveau
/// widget apparaît côté serveur avant d'être géré ici.
class DashboardData {
  DashboardData({
    required this.fullName,
    required this.roleSlug,
    required this.unreadNotifications,
    required this.latestNotifications,
    required this.shortcuts,
    required this.widgets,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? {};
    final notifications = json['notifications'] as Map<String, dynamic>? ?? {};
    return DashboardData(
      fullName: user['full_name'] as String? ?? '',
      roleSlug: user['role'] as String?,
      unreadNotifications: notifications['unread'] as int? ?? 0,
      latestNotifications:
          (notifications['latest'] as List?)?.cast<Map<String, dynamic>>() ?? const [],
      shortcuts: (json['shortcuts'] as List?)?.cast<Map<String, dynamic>>() ?? const [],
      widgets: json['widgets'] as Map<String, dynamic>? ?? const {},
    );
  }

  final String fullName;
  final String? roleSlug;
  final int unreadNotifications;
  final List<Map<String, dynamic>> latestNotifications;
  final List<Map<String, dynamic>> shortcuts;
  final Map<String, dynamic> widgets;
}
