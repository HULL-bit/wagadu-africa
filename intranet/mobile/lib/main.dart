import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/auth/state/auth_controller.dart';
import 'shared/widgets/app_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Dates en français (réunions, messagerie) — les données de locale `intl`
  // doivent être chargées explicitement avant le premier `DateFormat(...,
  // 'fr_FR')`, sinon il lève une exception au lieu de juste utiliser l'anglais.
  await initializeDateFormatting('fr_FR');
  runApp(const ProviderScope(child: WagaduHubApp()));
}

class WagaduHubApp extends StatelessWidget {
  const WagaduHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Wagadu Hub',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const _AuthGate(),
    );
  }
}

/// Bascule entre connexion / contenu selon [AuthController] — pas besoin
/// d'un routeur à onglets/URLs pour l'instant : juste deux états à ce
/// stade (voir `auth_controller.dart`).
class _AuthGate extends ConsumerWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    return switch (authState) {
      AuthChecking() => const Scaffold(body: Center(child: CircularProgressIndicator())),
      AuthLoggedOut() => const LoginPage(),
      AuthLoggedIn() => const AppShell(),
    };
  }
}
