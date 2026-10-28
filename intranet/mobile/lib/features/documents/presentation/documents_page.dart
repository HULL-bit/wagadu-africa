import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/document.dart';
import '../state/documents_providers.dart';

class DocumentsPage extends StatelessWidget {
  const DocumentsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Documents'),
          bottom: const TabBar(tabs: [Tab(text: 'Tous'), Tab(text: 'Reçus')]),
        ),
        body: const TabBarView(children: [_AllDocumentsTab(), _ReceivedDocumentsTab()]),
      ),
    );
  }
}

class _AllDocumentsTab extends ConsumerWidget {
  const _AllDocumentsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final documentsAsync = ref.watch(documentsProvider);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            decoration: const InputDecoration(hintText: 'Rechercher un document…', prefixIcon: Icon(Icons.search)),
            onChanged: (value) => ref.read(documentSearchProvider.notifier).state = value,
          ),
        ),
        Expanded(
          child: documentsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => const Center(child: Text('Impossible de charger les documents.')),
            data: (documents) {
              if (documents.isEmpty) return const Center(child: Text('Aucun document.'));
              return ListView.separated(
                itemCount: documents.length,
                separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
                itemBuilder: (context, index) => _DocumentTile(document: documents[index]),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ReceivedDocumentsTab extends ConsumerWidget {
  const _ReceivedDocumentsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final receivedAsync = ref.watch(receivedDocumentsProvider);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(receivedDocumentsProvider.future),
      child: receivedAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => ListView(children: const [
          Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Impossible de charger les envois.'))),
        ]),
        data: (received) {
          if (received.isEmpty) {
            return ListView(children: const [
              Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Rien ne vous a été envoyé.'))),
            ]);
          }
          return ListView.separated(
            itemCount: received.length,
            separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, index) => _ReceivedTile(item: received[index]),
          );
        },
      ),
    );
  }
}

class _DocumentTile extends ConsumerWidget {
  const _DocumentTile({required this.document});
  final HubDocument document;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: const CircleAvatar(
        backgroundColor: WagaduColors.sand,
        foregroundColor: WagaduColors.ebony,
        child: Icon(Icons.description_outlined),
      ),
      title: Text(document.title),
      subtitle: Text(
        [document.folderName, document.sizeLabel].where((e) => e != null && e.isNotEmpty).join(' · '),
      ),
      onTap: () => _openDocument(context, ref, document.id, document.currentVersionFilename ?? document.title),
    );
  }
}

class _ReceivedTile extends ConsumerWidget {
  const _ReceivedTile({required this.item});
  final ReceivedDocument item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: item.isRead ? WagaduColors.sand : WagaduColors.amber.withValues(alpha: 0.3),
        foregroundColor: WagaduColors.ebony,
        child: const Icon(Icons.description_outlined),
      ),
      title: Text(item.title, style: TextStyle(fontWeight: item.isRead ? FontWeight.w500 : FontWeight.w700)),
      subtitle: Text([
        if (item.sentByEmail != null) 'de ${item.sentByEmail}',
        if (item.sentAt != null) DateFormat.yMMMd('fr_FR').format(item.sentAt!.toLocal()),
      ].join(' · ')),
      onTap: () => _openDocument(context, ref, item.documentId, item.title),
    );
  }
}

Future<void> _openDocument(BuildContext context, WidgetRef ref, int documentId, String filename) async {
  final messenger = ScaffoldMessenger.of(context);
  messenger.showSnackBar(const SnackBar(content: Text('Téléchargement…'), duration: Duration(seconds: 2)));
  try {
    await ref.read(documentsRepositoryProvider).downloadAndOpen(documentId, filename);
  } catch (_) {
    messenger.showSnackBar(const SnackBar(content: Text('Impossible d\'ouvrir ce document.')));
  }
}
