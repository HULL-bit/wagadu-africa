import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/state/auth_controller.dart';
import '../models/dashboard_data.dart';
import '../state/dashboard_provider.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);
    final authState = ref.watch(authControllerProvider);
    final greetingName = authState is AuthLoggedIn ? authState.user.firstName : '';

    return Scaffold(
      appBar: AppBar(title: const Text('Tableau de bord')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(dashboardProvider.future),
        child: dashboardAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorState(
            message: 'Impossible de charger le tableau de bord.',
            onRetry: () => ref.invalidate(dashboardProvider),
          ),
          data: (data) => _DashboardBody(data: data, greetingName: greetingName),
        ),
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.data, required this.greetingName});

  final DashboardData data;
  final String greetingName;

  @override
  Widget build(BuildContext context) {
    final widgets = data.widgets;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          greetingName.isEmpty ? 'Bonjour' : 'Bonjour, $greetingName',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 4),
        Text(
          '${data.unreadNotifications} notification${data.unreadNotifications > 1 ? 's' : ''} non lue${data.unreadNotifications > 1 ? 's' : ''}',
          style: TextStyle(color: WagaduColors.ebony.withValues(alpha: 0.6)),
        ),
        if (data.latestNotifications.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Récentes', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...data.latestNotifications.map(
            (n) => Card(
              child: ListTile(
                leading: Icon(
                  n['is_read'] == true ? Icons.notifications_none : Icons.notifications_active,
                  color: n['is_read'] == true ? Colors.grey : WagaduColors.amber,
                ),
                title: Text(n['title']?.toString() ?? ''),
              ),
            ),
          ),
        ],
        if (widgets.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Aperçu', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: widgets.entries.expand<Widget>((widgetEntry) {
              final section = widgetEntry.value;
              if (section is! Map) return const <Widget>[];
              return section.entries.map((statEntry) {
                return _StatCard(
                  label: '${widgetEntry.key} · ${statEntry.key}'.replaceAll('_', ' '),
                  value: statEntry.value.toString(),
                );
              });
            }).toList(),
          ),
        ],
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(color: WagaduColors.terracotta, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 12),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 40, color: Colors.grey),
          const SizedBox(height: 12),
          Text(message),
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: const Text('Réessayer')),
        ],
      ),
    );
  }
}
