import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/state/auth_controller.dart';
import '../models/channel.dart';
import '../state/messaging_providers.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key, required this.channel});
  final ChannelSummary channel;

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(chatControllerProvider(widget.channel.id));
    final myId = switch (ref.watch(authControllerProvider)) {
      AuthLoggedIn(:final user) => user.id,
      _ => null,
    };

    ref.listen(chatControllerProvider(widget.channel.id), (_, _) => _scrollToBottom());

    return Scaffold(
      appBar: AppBar(title: Text(widget.channel.displayName)),
      body: Column(
        children: [
          Expanded(
            child: messagesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => const Center(child: Text('Impossible de charger les messages.')),
              data: (messages) {
                if (messages.isEmpty) {
                  return const Center(child: Text('Aucun message. Dites bonjour !'));
                }
                _scrollToBottom();
                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(12),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final isMine = message.authorId == myId;
                    return _MessageBubble(message: message, isMine: isMine);
                  },
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      decoration: const InputDecoration(hintText: 'Écrire un message…'),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _send,
                    icon: const Icon(Icons.send),
                    style: IconButton.styleFrom(backgroundColor: WagaduColors.terracotta),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _send() {
    final text = _controller.text;
    if (text.trim().isEmpty) return;
    ref.read(chatControllerProvider(widget.channel.id).notifier).send(text);
    _controller.clear();
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.isMine});
  final ChatMessage message;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMine ? WagaduColors.terracotta : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: isMine ? null : Border.all(color: WagaduColors.sand),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!isMine)
              Text(
                message.authorName,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: WagaduColors.terracotta),
              ),
            Text(message.body, style: TextStyle(color: isMine ? Colors.white : WagaduColors.ebony)),
            const SizedBox(height: 2),
            Text(
              DateFormat.Hm().format(message.createdAt.toLocal()),
              style: TextStyle(fontSize: 10, color: isMine ? Colors.white70 : Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
