import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'network/dio_client.dart';
import 'storage/token_storage.dart';
import '../features/auth/data/auth_repository.dart';
import '../features/dashboard/data/dashboard_repository.dart';
import '../features/directory/data/directory_repository.dart';
import '../features/account/data/account_repository.dart';

/// Singletons d'infrastructure — un seul [Dio]/[TokenStorage] pour toute
/// l'app, partagé par tous les repositories de fonctionnalités.
final tokenStorageProvider = Provider((ref) => TokenStorage());

final dioClientProvider = Provider((ref) => DioClient(ref.watch(tokenStorageProvider)));

final authRepositoryProvider = Provider(
  (ref) => AuthRepository(ref.watch(dioClientProvider), ref.watch(tokenStorageProvider)),
);

final dashboardRepositoryProvider = Provider(
  (ref) => DashboardRepository(ref.watch(dioClientProvider)),
);

final directoryRepositoryProvider = Provider(
  (ref) => DirectoryRepository(ref.watch(dioClientProvider)),
);

final accountRepositoryProvider = Provider(
  (ref) => AccountRepository(ref.watch(dioClientProvider)),
);
