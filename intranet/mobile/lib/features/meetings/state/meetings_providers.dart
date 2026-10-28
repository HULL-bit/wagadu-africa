import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/meetings_repository.dart';
import '../models/meeting.dart';

final meetingsRepositoryProvider = Provider((ref) => MeetingsRepository(ref.watch(dioClientProvider)));

final meetingsProvider = FutureProvider.autoDispose<List<Meeting>>((ref) {
  return ref.watch(meetingsRepositoryProvider).list();
});
