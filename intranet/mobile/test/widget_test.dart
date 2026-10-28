// Smoke test minimal : vérifie que l'écran de connexion se construit et
// affiche ses champs essentiels. On pompe `LoginPage` directement plutôt
// que `WagaduHubApp` en entier : celui-ci passe par `AuthController`, qui
// lit le stockage sécurisé au démarrage — un canal de plateforme absent en
// environnement de test, sans intérêt à mocker pour un simple smoke test.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:wagadu_hub_mobile/core/theme/app_theme.dart';
import 'package:wagadu_hub_mobile/features/auth/presentation/login_page.dart';

void main() {
  testWidgets('La page de connexion affiche e-mail, mot de passe et le bouton', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(theme: null, home: LoginPage()),
      ),
    );

    expect(find.text('E-mail'), findsOneWidget);
    expect(find.text('Mot de passe'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
  });

  test('AppTheme.light se construit sans erreur', () {
    expect(AppTheme.light, isNotNull);
  });
}
