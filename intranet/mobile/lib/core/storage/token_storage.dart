import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stockage sécurisé des jetons JWT — équivalent mobile du `localStorage`
/// utilisé par le Hub web (`lib/api.ts`, clés `wh_access`/`wh_refresh`),
/// mais chiffré (Keystore/Keychain) plutôt qu'en clair.
class TokenStorage {
  TokenStorage() : _storage = const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'wh_access';
  static const _refreshKey = 'wh_refresh';

  Future<String?> get access => _storage.read(key: _accessKey);
  Future<String?> get refresh => _storage.read(key: _refreshKey);

  Future<void> save({required String access, String? refresh}) async {
    await _storage.write(key: _accessKey, value: access);
    if (refresh != null) {
      await _storage.write(key: _refreshKey, value: refresh);
    }
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
