import 'package:flutter/material.dart';

import '../../features/account/presentation/account_page.dart';
import '../../features/dashboard/presentation/dashboard_page.dart';
import '../../features/directory/presentation/directory_page.dart';
import 'coming_soon_page.dart';

/// Coquille de navigation — barre de navigation basse (pattern mobile
/// standard) en remplacement de la barre latérale du Hub web
/// (`frontend/components/Sidebar.tsx`), elle-même pensée pour un grand
/// écran. Les 3 premiers onglets sont pleinement fonctionnels ; "Plus"
/// recense le reste à venir (voir `ComingSoonPage`).
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static const _pages = [DashboardPage(), DirectoryPage(), AccountPage(), ComingSoonPage()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.space_dashboard_outlined), selectedIcon: Icon(Icons.space_dashboard), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Annuaire'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Compte'),
          NavigationDestination(icon: Icon(Icons.apps_outlined), selectedIcon: Icon(Icons.apps), label: 'Plus'),
        ],
      ),
    );
  }
}
