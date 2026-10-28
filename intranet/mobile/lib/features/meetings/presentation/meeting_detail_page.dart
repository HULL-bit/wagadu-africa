import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../models/meeting.dart';
import '../state/meetings_providers.dart';

class MeetingDetailPage extends ConsumerStatefulWidget {
  const MeetingDetailPage({super.key, required this.meetingId, this.initial});
  final int meetingId;
  final Meeting? initial;

  @override
  ConsumerState<MeetingDetailPage> createState() => _MeetingDetailPageState();
}

class _MeetingDetailPageState extends ConsumerState<MeetingDetailPage> {
  Meeting? _meeting;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _meeting = widget.initial;
  }

  Future<void> _respond(String response) async {
    setState(() => _busy = true);
    try {
      final updated =
          await ref.read(meetingsRepositoryProvider).respond(widget.meetingId, response);
      setState(() => _meeting = updated);
      ref.invalidate(meetingsProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _join() async {
    setState(() => _busy = true);
    try {
      final info = await ref.read(meetingsRepositoryProvider).join(widget.meetingId);
      if (!info.configured || info.url.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('La visioconférence n\'est pas configurée.')),
          );
        }
        return;
      }
      final uri = Uri.parse(info.url).replace(
        queryParameters: info.jwt != null ? {'jwt': info.jwt!} : null,
      );
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _vote(MeetingPoll poll, PollOption option) async {
    final updated = await ref
        .read(meetingsRepositoryProvider)
        .votePoll(widget.meetingId, poll.id, option.id);
    setState(() => _meeting = updated);
  }

  @override
  Widget build(BuildContext context) {
    final meeting = _meeting;
    if (meeting == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final dateFormat = DateFormat('EEEE d MMMM yyyy · HH:mm', 'fr_FR');

    return Scaffold(
      appBar: AppBar(title: Text(meeting.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(dateFormat.format(meeting.start.toLocal()), style: Theme.of(context).textTheme.titleMedium),
          Text(
            'jusqu\'à ${DateFormat.Hm().format(meeting.end.toLocal())} · organisé par ${meeting.organizerName}',
            style: TextStyle(color: WagaduColors.ebony.withValues(alpha: 0.6)),
          ),
          if (meeting.description.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(meeting.description),
          ],
          if (meeting.agenda != null && meeting.agenda!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('Ordre du jour', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(meeting.agenda!),
          ],
          const SizedBox(height: 24),
          if (!meeting.isPast)
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _join,
                    icon: const Icon(Icons.videocam),
                    label: const Text('Rejoindre'),
                  ),
                ),
              ],
            ),
          const SizedBox(height: 12),
          if (!meeting.isPast) ...[
            Text('Ma réponse', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                _ResponseChip(label: 'Accepter', value: 'accepted', onTap: () => _respond('accepted')),
                _ResponseChip(label: 'Peut-être', value: 'tentative', onTap: () => _respond('tentative')),
                _ResponseChip(label: 'Refuser', value: 'declined', onTap: () => _respond('declined')),
              ],
            ),
          ],
          if (meeting.minutes != null && meeting.minutes!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('Compte-rendu', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(meeting.minutes!),
          ],
          if (meeting.polls.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text('Sondages', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...meeting.polls.map((poll) => _PollCard(poll: poll, onVote: (option) => _vote(poll, option))),
          ],
          const SizedBox(height: 24),
          Text('Participants (${meeting.participants.length})', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: meeting.participants
                  .map((p) => ListTile(
                        dense: true,
                        leading: Icon(_responseIcon(p.response), color: _responseColor(p.response), size: 20),
                        title: Text(p.name),
                        trailing: p.isOrganizer
                            ? const Text('Organisateur', style: TextStyle(fontSize: 11, color: Colors.grey))
                            : null,
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  IconData _responseIcon(String? response) => switch (response) {
        'accepted' => Icons.check_circle,
        'declined' => Icons.cancel,
        'tentative' => Icons.help,
        _ => Icons.schedule,
      };

  Color _responseColor(String? response) => switch (response) {
        'accepted' => Colors.green,
        'declined' => Colors.red,
        'tentative' => Colors.orange,
        _ => Colors.grey,
      };
}

class _ResponseChip extends StatelessWidget {
  const _ResponseChip({required this.label, required this.value, required this.onTap});
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(label: Text(label), onPressed: onTap);
  }
}

class _PollCard extends StatelessWidget {
  const _PollCard({required this.poll, required this.onVote});
  final MeetingPoll poll;
  final ValueChanged<PollOption> onVote;

  @override
  Widget build(BuildContext context) {
    final totalVotes = poll.options.fold<int>(0, (sum, o) => sum + o.voteCount);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(poll.question, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...poll.options.map((option) {
              final share = totalVotes == 0 ? 0.0 : option.voteCount / totalVotes;
              final isMine = poll.myVote == option.id;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: InkWell(
                  onTap: poll.isOpen ? () => onVote(option) : null,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isMine ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                            size: 18,
                            color: isMine ? WagaduColors.terracotta : Colors.grey,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(option.label)),
                          Text('${option.voteCount}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: share,
                          minHeight: 4,
                          backgroundColor: WagaduColors.sand,
                          color: WagaduColors.terracotta,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            if (!poll.isOpen) ...[
              const SizedBox(height: 4),
              const Text('Sondage clos', style: TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ],
        ),
      ),
    );
  }
}
