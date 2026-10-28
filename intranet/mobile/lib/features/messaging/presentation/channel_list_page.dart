import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/channel.dart';
import '../state/messaging_providers.dart';
import 'chat_page.dart';

class ChannelListPage extends ConsumerWidget {
  const ChannelListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final channelsAsync = ref.watch(channelsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Messagerie')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(channelsProvider.future),
        child: channelsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => ListView(children: const [
            Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: Text('Impossible de charger la messagerie.')),
            ),
          ]),
          data: (channels) {
            if (channels.isEmpty) {
              return ListView(children: const [
                Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: Text('Aucune conversation pour le moment.')),
                ),
              ]);
            }
            return ListView.separated(
              itemCount: channels.length,
              separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
              itemBuilder: (context, index) => _ChannelTile(channel: channels[index]),
            );
          },
        ),
      ),
    );
  }
}

class _ChannelTile extends StatelessWidget {
  const _ChannelTile({required this.channel});
  final ChannelSummary channel;

  IconData get _icon => switch (channel.kind) {
        'direct' => Icons.person,
        'department' => Icons.apartment,
        _ => Icons.groups,
      };

  @override
  Widget build(BuildContext context) {
    final hasUnread = channel.unread > 0;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: WagaduColors.sand,
        foregroundColor: WagaduColors.ebony,
        child: Icon(_icon, size: 20),
      ),
      title: Text(
        channel.displayName,
        style: TextStyle(fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w500),
      ),
      subtitle: channel.lastMessageBody != null
          ? Text(
              '${channel.lastMessageAuthor}: ${channel.lastMessageBody}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            )
          : const Text('Aucun message'),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (channel.lastMessageAt != null)
            Text(
              DateFormat.Hm().format(channel.lastMessageAt!.toLocal()),
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          if (hasUnread) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: WagaduColors.terracotta,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '${channel.unread}',
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ChatPage(channel: channel)),
      ),
    );
  }
}
