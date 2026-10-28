import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/documents_repository.dart';
import '../models/document.dart';

final documentsRepositoryProvider = Provider(
  (ref) => DocumentsRepository(ref.watch(dioClientProvider)),
);

final documentSearchProvider = StateProvider.autoDispose<String>((ref) => '');

final documentsProvider = FutureProvider.autoDispose<List<HubDocument>>((ref) {
  final search = ref.watch(documentSearchProvider);
  return ref.watch(documentsRepositoryProvider).list(search: search);
});

final receivedDocumentsProvider = FutureProvider.autoDispose<List<ReceivedDocument>>((ref) {
  return ref.watch(documentsRepositoryProvider).received();
});
