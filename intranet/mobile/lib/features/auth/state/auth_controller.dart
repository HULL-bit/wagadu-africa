import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../models/me_user.dart';

sealed class AuthState {}

/// Au lancement de l'app, le temps de vérifier s'il existe une session
/// enregistrée (jeton en stockage sécurisé) avant d'afficher login ou
/// contenu.
class AuthChecking extends AuthState {}

class AuthLoggedOut extends AuthState {}

class AuthLoggedIn extends AuthState {
  AuthLoggedIn(this.user);
  final MeUser user;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(AuthChecking()) {
    _restoreSession();
  }

  final AuthRepository _repository;

  Future<void> _restoreSession() async {
    if (!await _repository.hasStoredSession()) {
      state = AuthLoggedOut();
      return;
    }
    final user = await _repository.fetchMe();
    state = user != null ? AuthLoggedIn(user) : AuthLoggedOut();
  }

  Future<LoginResult> login({
    required String email,
    required String password,
    String? totpCode,
  }) async {
    final result = await _repository.login(email: email, password: password, totpCode: totpCode);
    if (result is LoginSuccess) {
      state = AuthLoggedIn(result.user);
    }
    return result;
  }

  Future<void> logout() async {
    await _repository.logout();
    state = AuthLoggedOut();
  }

  /// Met à jour l'utilisateur en mémoire après un `PATCH /auth/me/` réussi,
  /// sans refaire d'appel réseau (la réponse du PATCH est déjà la donnée à
  /// jour, voir `AccountRepository.updateProfile`).
  void setUser(MeUser user) {
    state = AuthLoggedIn(user);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref.watch(authRepositoryProvider)),
);
