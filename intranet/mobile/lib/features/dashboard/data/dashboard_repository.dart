import '../../../core/network/dio_client.dart';
import '../models/dashboard_data.dart';

class DashboardRepository {
  DashboardRepository(this._dioClient);
  final DioClient _dioClient;

  Future<DashboardData> fetch() async {
    final response = await _dioClient.dio.get('/dashboard/');
    return DashboardData.fromJson(response.data as Map<String, dynamic>);
  }
}
