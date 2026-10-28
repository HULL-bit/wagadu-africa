import '../../../core/network/dio_client.dart';
import '../models/meeting.dart';

class MeetingsRepository {
  MeetingsRepository(this._dioClient);
  final DioClient _dioClient;

  Future<List<Meeting>> list() async {
    final response = await _dioClient.dio.get('/meetings/', queryParameters: {'limit': 100});
    final data = response.data;
    final results = data is Map ? data['results'] as List : data as List;
    return results.map((e) => Meeting.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Meeting> respond(int meetingId, String response) async {
    final result = await _dioClient.dio.post('/meetings/$meetingId/respond/', data: {'response': response});
    return Meeting.fromJson(result.data as Map<String, dynamic>);
  }

  Future<MeetingJoinInfo> join(int meetingId) async {
    final response = await _dioClient.dio.get('/meetings/$meetingId/join/');
    return MeetingJoinInfo.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Meeting> votePoll(int meetingId, int pollId, int optionId) async {
    await _dioClient.dio.post('/meeting-polls/$pollId/vote/', data: {'option': optionId});
    final response = await _dioClient.dio.get('/meetings/$meetingId/');
    return Meeting.fromJson(response.data as Map<String, dynamic>);
  }
}
