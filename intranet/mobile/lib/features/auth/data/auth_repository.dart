import 'package:dio/dio.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/token_storage.dart';
import '../models/me_user.dart';

/// Résultat d'une tentative de connexion : soit connecté·e, soit il manque
/// le code 2FA (le backend renvoie une erreur de champ `totp_code` dans ce
/// cas précis — voir `LoginSerializer.validate`), soit une erreur réelle.
sealed class LoginResult {}

class LoginSuccess extends LoginResult {
  LoginSuccess(this.user);
  final MeUser user;
}

class LoginNeeds2fa extends LoginResult {}

class LoginFailure extends LoginResult {
  LoginFailure(this.message);
  final String message;
}

class AuthRepository {
  AuthRepository(this._dioClient, this._tokenStorage);

  final DioClient _dioClient;
  final TokenStorage _tokenStorage;

  Future<LoginResult> login({
    required String email,
    required String password,
    String? totpCode,
  }) async {
    try {
      final response = await _dioClient.dio.post(
        '/auth/login/',
        data: {
          'email': email,
          'password': password,
          if (totpCode != null && totpCode.isNotEmpty) 'totp_code': totpCode,
        },
        options: Options(extra: {'auth': false}),
      );
      final data = response.data as Map<String, dynamic>;
      await _tokenStorage.save(access: data['access'] as String, refresh: data['refresh'] as String);
      return LoginSuccess(MeUser.fromJson(data['user'] as Map<String, dynamic>));
    } on DioException catch (e) {
      final data = e.response?.data;
      // Le backend distingue "code requis" et "code invalide" sous la même
      // clé de champ `totp_code` — dans les deux cas on redemande le code.
      if (data is Map && data.containsKey('totp_code')) {
        return LoginNeeds2fa();
      }
      return LoginFailure(toApiException(e).message);
    }
  }

  Future<MeUser?> fetchMe() async {
    try {
      final response = await _dioClient.dio.get('/auth/me/');
      return MeUser.fromJson(response.data as Map<String, dynamic>);
    } on DioException {
      return null;
    }
  }

  Future<void> logout() async {
    final refresh = await _tokenStorage.refresh;
    if (refresh != null) {
      try {
        await _dioClient.dio.post('/auth/logout/', data: {'refresh': refresh});
      } catch (_) {
        // On nettoie quand même la session locale même si l'appel échoue
        // (pas de réseau, jeton déjà expiré, etc.).
      }
    }
    await _tokenStorage.clear();
  }

  Future<bool> hasStoredSession() async {
    final access = await _tokenStorage.access;
    return access != null;
  }
}
