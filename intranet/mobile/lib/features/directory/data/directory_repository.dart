import '../../../core/network/dio_client.dart';
import '../models/member.dart';

class DirectoryRepository {
  DirectoryRepository(this._dioClient);
  final DioClient _dioClient;

  /// `MemberDirectoryViewSet` pagine par défaut (25/page) — on demande une
  /// grande limite plutôt que de gérer le défilement infini pour ce
  /// premier jet (un annuaire d'ONG reste d'une taille raisonnable).
  Future<List<Member>> search(String query) async {
    final response = await _dioClient.dio.get(
      '/directory/',
      queryParameters: {
        'limit': 200,
        if (query.trim().isNotEmpty) 'search': query.trim(),
      },
    );
    final results = (response.data as Map<String, dynamic>)['results'] as List;
    return results.map((e) => Member.fromJson(e as Map<String, dynamic>)).toList();
  }
}
