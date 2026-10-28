import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/meeting.dart';
import '../state/meetings_providers.dart';
import 'meeting_detail_page.dart';

class MeetingsPage extends StatelessWidget {
  const MeetingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Réunions'),
          bottom: const TabBar(tabs: [Tab(text: 'À venir'), Tab(text: 'Passées')]),
        ),
        body: const TabBarView(children: [_MeetingsTab(upcoming: true), _MeetingsTab(upcoming: false)]),
      ),
    );
  }
}

class _MeetingsTab extends ConsumerWidget {
  const _MeetingsTab({required this.upcoming});
  final bool upcoming;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meetingsAsync = ref.watch(meetingsProvider);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(meetingsProvider.future),
      child: meetingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => ListView(children: const [
          Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Impossible de charger les réunions.'))),
        ]),
        data: (meetings) {
          final filtered = meetings.where((m) => m.isPast != upcoming).toList()
            ..sort((a, b) => upcoming ? a.start.compareTo(b.start) : b.start.compareTo(a.start));
          if (filtered.isEmpty) {
            return ListView(children: [
              Padding(
                padding: const EdgeInsets.all(32),
                child: Center(child: Text(upcoming ? 'Aucune réunion à venir.' : 'Aucune réunion passée.')),
              ),
            ]);
          }
          return ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: filtered.length,
            separatorBuilder: (_, _) => const Divider(height: 1, indent: 16),
            itemBuilder: (context, index) => _MeetingTile(meeting: filtered[index]),
          );
        },
      ),
    );
  }
}

class _MeetingTile extends StatelessWidget {
  const _MeetingTile({required this.meeting});
  final Meeting meeting;

  Color get _statusColor => switch (meeting.status) {
        'ongoing' => Colors.green,
        'cancelled' => Colors.red,
        'closed' => Colors.grey,
        _ => WagaduColors.terracotta,
      };

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEE d MMM · HH:mm', 'fr_FR');
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: _statusColor.withValues(alpha: 0.15),
        foregroundColor: _statusColor,
        child: const Icon(Icons.videocam_outlined),
      ),
      title: Text(meeting.title),
      subtitle: Text('${dateFormat.format(meeting.start.toLocal())} · ${meeting.organizerName}'),
      trailing: Text(meeting.statusDisplay, style: TextStyle(color: _statusColor, fontSize: 12)),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => MeetingDetailPage(meetingId: meeting.id, initial: meeting)),
      ),
    );
  }
}
