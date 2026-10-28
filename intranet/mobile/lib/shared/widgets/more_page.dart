import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../features/account/presentation/account_page.dart';
import '../../features/directory/presentation/directory_page.dart';

/// Les fonctionnalités moins fréquentes (et le reste de la feuille de route)
/// vivent ici plutôt que dans la barre de navigation basse — 5-6 onglets à
/// plat serait trop pour un usage mobile confortable (voir
/// `app_shell.dart`).
class _FeatureGroup {
  const _FeatureGroup(this.title, this.items);
  final String title;
  final List<String> items;
}

const _roadmap = [
  _FeatureGroup('Travail', ['Tâches (liste, Kanban, calendrier)', 'Courrier']),
  _FeatureGroup('Projets', ['Projets, jalons, indicateurs']),
  _FeatureGroup('RH', ['Dossiers employés', 'Évaluations', 'Cycle de vie (onboarding/offboarding)', 'Congés & validation']),
  _FeatureGroup('Vie interne', ['Sondages', 'Demandes & validation']),
  _FeatureGroup('Pilotage', ['Rapports (XLSX/PDF)']),
  _FeatureGroup('Administration', ['Utilisateurs', 'Départements', 'Rôles', 'Annonces', 'Journal d\'audit', 'Incidents', 'Système']),
];

class MorePage extends StatelessWidget {
  const MorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.people_outline),
                  title: const Text('Annuaire'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const DirectoryPage()),
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: const Text('Mon compte'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AccountPage()),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Ces fonctionnalités existent déjà sur le Hub web et arrivent ici par étapes.',
            style: TextStyle(color: WagaduColors.ebony.withValues(alpha: 0.6)),
          ),
          const SizedBox(height: 12),
          for (final group in _roadmap) ...[
            Text(group.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Card(
              child: Column(
                children: [
                  for (final item in group.items)
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.schedule, color: Colors.grey, size: 20),
                      title: Text(item),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }
}
