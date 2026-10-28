import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Recensement complet des écrans du Hub web (voir `intranet/frontend/app/`)
/// qui n'ont pas encore d'équivalent mobile — pour que la structure de nav
/// reflète "toutes les fonctionnalités" dès ce premier jet, même si leur
/// implémentation arrive par lots suivants plutôt que d'un coup.
class _FeatureGroup {
  const _FeatureGroup(this.title, this.items);
  final String title;
  final List<String> items;
}

const _roadmap = [
  _FeatureGroup('Travail', ['Tâches (liste, Kanban, calendrier)', 'Courrier', 'Documents', 'Réunions (Jitsi)', 'Messagerie']),
  _FeatureGroup('Projets', ['Projets, jalons, indicateurs']),
  _FeatureGroup('RH', ['Dossiers employés', 'Évaluations', 'Cycle de vie (onboarding/offboarding)', 'Congés & validation']),
  _FeatureGroup('Vie interne', ['Sondages', 'Demandes & validation']),
  _FeatureGroup('Pilotage', ['Rapports (XLSX/PDF)']),
  _FeatureGroup('Administration', ['Utilisateurs', 'Départements', 'Rôles', 'Annonces', 'Journal d\'audit', 'Incidents', 'Système']),
];

class ComingSoonPage extends StatelessWidget {
  const ComingSoonPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Ces fonctionnalités existent déjà sur le Hub web et arrivent '
            'ici par étapes.',
            style: TextStyle(color: WagaduColors.ebony.withValues(alpha: 0.6)),
          ),
          const SizedBox(height: 16),
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
