import 'dart:io' show Platform;

/// Base URL of the Wagadu Hub API, same backend the Next.js PWA talks to
/// (`intranet/frontend`, see `lib/api.ts`). Override at build/run time:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
///
/// With no override, picks a sensible default for "run it locally against
/// `docker compose up` on this same machine": the Android emulator can't
/// reach the host via `localhost` (it needs the `10.0.2.2` loopback
/// alias), while Linux/macOS/Windows desktop and the iOS simulator share
/// the host network directly. For the real production API, always pass
/// `--dart-define=API_BASE_URL=https://intranet.wagadu-africa.org/api/v1`.
class Env {
  static const _override = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    if (_override.isNotEmpty) return _override;
    if (!Platform.isAndroid) return 'http://localhost:8000/api/v1';
    return 'http://10.0.2.2:8000/api/v1';
  }
}
