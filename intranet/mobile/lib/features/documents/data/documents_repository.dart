import 'dart:io';

import 'package:dio/dio.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/network/dio_client.dart';
import '../models/document.dart';

class DocumentsRepository {
  DocumentsRepository(this._dioClient);
  final DioClient _dioClient;

  Future<List<HubDocument>> list({String? search, bool libraryOnly = false}) async {
    final response = await _dioClient.dio.get(
      '/documents/',
      queryParameters: {
        'limit': 100,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (libraryOnly) 'library': 'true',
      },
    );
    final data = response.data;
    final results = data is Map ? data['results'] as List : data as List;
    return results.map((e) => HubDocument.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ReceivedDocument>> received({bool unreadOnly = false}) async {
    final response = await _dioClient.dio.get(
      '/documents/received/',
      queryParameters: unreadOnly ? {'unread': 'true'} : null,
    );
    final results = response.data as List;
    return results.map((e) => ReceivedDocument.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> markRead(int documentId) async {
    await _dioClient.dio.post('/documents/$documentId/mark-read/');
  }

  /// Télécharge le document (authentifié — pas une URL publique) dans un
  /// dossier temporaire puis l'ouvre avec le visualiseur du système
  /// (fonctionne aussi bien sur Linux desktop que sur mobile, `open_file`
  /// délègue à xdg-open/l'équivalent de la plateforme).
  Future<void> downloadAndOpen(int documentId, String filename) async {
    final response = await _dioClient.dio.get<List<int>>(
      '/documents/$documentId/download/',
      options: Options(responseType: ResponseType.bytes),
    );
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$filename');
    await file.writeAsBytes(response.data!);
    await OpenFile.open(file.path);
  }
}
