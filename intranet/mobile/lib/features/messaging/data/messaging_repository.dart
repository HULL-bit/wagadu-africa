import '../../../core/network/dio_client.dart';
import '../models/channel.dart';

class MessagingRepository {
  MessagingRepository(this._dioClient);
  final DioClient _dioClient;

  Future<List<ChannelSummary>> listChannels() async {
    final response = await _dioClient.dio.get('/messaging/channels/', queryParameters: {'limit': 100});
    final data = response.data;
    // ChannelViewSet n'a que `list` — paginé par défaut (LimitOffsetPagination).
    final results = data is Map ? data['results'] as List : data as List;
    return results.map((e) => ChannelSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ChatMessage>> fetchMessages(int channelId, {int? beforeId}) async {
    final response = await _dioClient.dio.get(
      '/messaging/channels/$channelId/messages/',
      queryParameters: beforeId != null ? {'before': beforeId} : null,
    );
    final results = response.data as List;
    return results.map((e) => ChatMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> sendMessage(int channelId, String body) async {
    final response = await _dioClient.dio.post(
      '/messaging/channels/$channelId/messages/',
      data: {'body': body},
    );
    return ChatMessage.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> markRead(int channelId) async {
    await _dioClient.dio.post('/messaging/channels/$channelId/read/');
  }

  Future<ChannelSummary> openDirectChannel(String userId) async {
    final response = await _dioClient.dio.post('/messaging/channels/direct/', data: {'user': userId});
    return ChannelSummary.fromJson(response.data as Map<String, dynamic>);
  }
}
