import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/messaging_repository.dart';
import '../models/channel.dart';

final messagingRepositoryProvider = Provider(
  (ref) => MessagingRepository(ref.watch(dioClientProvider)),
);

final channelsProvider = FutureProvider.autoDispose<List<ChannelSummary>>((ref) {
  return ref.watch(messagingRepositoryProvider).listChannels();
});

/// Fil de messages d'un canal — interrogé toutes les 4 s pendant que
/// l'écran est ouvert, même mécanisme que le Hub web
/// (`frontend/app/(app)/messagerie/page.tsx`), faute de WebSocket côté
/// backend pour l'instant.
class ChatController extends StateNotifier<AsyncValue<List<ChatMessage>>> {
  ChatController(this._repository, this.channelId) : super(const AsyncValue.loading()) {
    _load();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) => _poll());
  }

  final MessagingRepository _repository;
  final int channelId;
  Timer? _timer;
  bool _sending = false;

  Future<void> _load() async {
    try {
      final messages = await _repository.fetchMessages(channelId);
      state = AsyncValue.data(messages);
      await _repository.markRead(channelId);
    } catch (error, stack) {
      state = AsyncValue.error(error, stack);
    }
  }

  Future<void> _poll() async {
    final current = state.value;
    if (current == null) return _load();
    try {
      final messages = await _repository.fetchMessages(channelId);
      if (messages.length != current.length) {
        state = AsyncValue.data(messages);
        await _repository.markRead(channelId);
      }
    } catch (_) {
      // Échec silencieux d'un sondage — pas la peine d'afficher une erreur
      // pour un simple hoquet réseau, le prochain sondage réessaiera.
    }
  }

  Future<void> send(String body) async {
    if (_sending || body.trim().isEmpty) return;
    _sending = true;
    try {
      final message = await _repository.sendMessage(channelId, body.trim());
      final current = state.value ?? [];
      state = AsyncValue.data([...current, message]);
    } finally {
      _sending = false;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final chatControllerProvider = StateNotifierProvider.autoDispose
    .family<ChatController, AsyncValue<List<ChatMessage>>, int>((ref, channelId) {
  return ChatController(ref.watch(messagingRepositoryProvider), channelId);
});
