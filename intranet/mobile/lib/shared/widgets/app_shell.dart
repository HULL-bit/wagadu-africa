import 'package:flutter/material.dart';

import '../../features/dashboard/presentation/dashboard_page.dart';
import '../../features/documents/presentation/documents_page.dart';
import '../../features/meetings/presentation/meetings_page.dart';
import '../../features/messaging/presentation/channel_list_page.dart';
import 'more_page.dart';

/// Coquille de navigation — barre de navigation basse (pattern mobile
/// standard) en remplacement de la barre latérale du Hub web
/// (`frontend/components/Sidebar.tsx`), elle-même pensée pour un grand
/// écran. 5 destinations pleinement fonctionnelles ; "Plus" regroupe
/// l'annuaire, le compte, et le reste de la feuille de route
/// (voir `MorePage`) — 6+ onglets à plat serait trop pour du mobile.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static const _pages = [
    DashboardPage(),
    ChannelListPage(),
    DocumentsPage(),
    MeetingsPage(),
    MorePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.space_dashboard_outlined), selectedIcon: Icon(Icons.space_dashboard), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Messages'),
          NavigationDestination(icon: Icon(Icons.description_outlined), selectedIcon: Icon(Icons.description), label: 'Documents'),
          NavigationDestination(icon: Icon(Icons.videocam_outlined), selectedIcon: Icon(Icons.videocam), label: 'Réunions'),
          NavigationDestination(icon: Icon(Icons.apps_outlined), selectedIcon: Icon(Icons.apps), label: 'Plus'),
        ],
      ),
    );
  }
}
