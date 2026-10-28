import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../models/member.dart';

final directorySearchQueryProvider = StateProvider.autoDispose<String>((ref) => '');

final directoryProvider = FutureProvider.autoDispose<List<Member>>((ref) {
  final query = ref.watch(directorySearchQueryProvider);
  return ref.watch(directoryRepositoryProvider).search(query);
});
