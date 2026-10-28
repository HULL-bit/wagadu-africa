import '../../../core/network/dio_client.dart';
import '../../auth/models/me_user.dart';

class AccountRepository {
  AccountRepository(this._dioClient);
  final DioClient _dioClient;

  /// Champs de `SelfServiceSerializer` (`apps/accounts/serializers.py`) —
  /// ce qu'un membre peut modifier lui-même.
  Future<MeUser> updateProfile(Map<String, dynamic> fields) async {
    final response = await _dioClient.dio.patch('/auth/me/', data: fields);
    return MeUser.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _dioClient.dio.post(
      '/auth/change-password/',
      data: {'current_password': currentPassword, 'new_password': newPassword},
    );
  }
}
