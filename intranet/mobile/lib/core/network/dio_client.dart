import 'dart:async';

import 'package:dio/dio.dart';

import '../env.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Client HTTP unique pour toute l'app — même comportement que le client
/// web (`intranet/frontend/lib/api.ts`) : jeton Bearer injecté, rafraîchi
/// automatiquement sur un 401 puis la requête est rejouée une seule fois.
///
/// Un seul rafraîchissement à la fois même si plusieurs requêtes échouent
/// en même temps (le web n'a pas ce souci : une page = peu de requêtes
/// concurrentes ; un écran mobile avec plusieurs widgets qui chargent en
/// parallèle, si).
class DioClient {
  DioClient(this._tokenStorage) : dio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl)) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.extra['auth'] != false) {
            final access = await _tokenStorage.access;
            if (access != null) {
              options.headers['Authorization'] = 'Bearer $access';
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final request = error.requestOptions;
          final isAuthEndpoint = request.path.contains('/auth/login') ||
              request.path.contains('/auth/refresh');
          if (error.response?.statusCode == 401 &&
              request.extra['retried'] != true &&
              !isAuthEndpoint) {
            final refreshed = await _refresh();
            if (refreshed) {
              try {
                final retryResponse = await dio.fetch(
                  request..extra['retried'] = true,
                );
                return handler.resolve(retryResponse);
              } catch (_) {
                // tombe au clear() ci-dessous
              }
            }
            await _tokenStorage.clear();
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;
  final TokenStorage _tokenStorage;
  Future<bool>? _refreshing;

  Future<bool> _refresh() {
    // Si un rafraîchissement est déjà en cours, les autres requêtes en
    // échec attendent son résultat plutôt que d'en déclencher un chacune.
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<bool> _doRefresh() async {
    final refresh = await _tokenStorage.refresh;
    if (refresh == null) return false;
    try {
      final response = await Dio(BaseOptions(baseUrl: Env.apiBaseUrl)).post(
        '/auth/refresh/',
        data: {'refresh': refresh},
      );
      await _tokenStorage.save(
        access: response.data['access'] as String,
        refresh: response.data['refresh'] as String?,
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}

/// Convertit une [DioException] en [ApiException] exploitable par l'UI —
/// à appeler dans les repositories autour de chaque appel réseau.
ApiException toApiException(DioException e) {
  return ApiException(e.response?.statusCode, e.response?.data);
}
