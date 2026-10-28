import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/models/me_user.dart';
import '../../auth/state/auth_controller.dart';

class AccountPage extends ConsumerWidget {
  const AccountPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    if (authState is! AuthLoggedIn) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Mon compte')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: WagaduColors.sand,
                  backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                  child: user.avatarUrl == null
                      ? Text(
                          user.fullName.isEmpty ? '?' : user.fullName[0].toUpperCase(),
                          style: const TextStyle(fontSize: 28),
                        )
                      : null,
                ),
                const SizedBox(height: 12),
                Text(user.fullName, style: Theme.of(context).textTheme.titleLarge),
                if (user.jobTitle != null) Text(user.jobTitle!),
                Text(user.email, style: TextStyle(color: WagaduColors.ebony.withValues(alpha: 0.6))),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.edit_outlined),
                  title: const Text('Modifier mon profil'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _openEditProfile(context, ref, user),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.lock_outline),
                  title: const Text('Changer mon mot de passe'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _openChangePassword(context, ref),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Icon(
                    user.is2faEnabled ? Icons.verified_user_outlined : Icons.gpp_maybe_outlined,
                    color: user.is2faEnabled ? Colors.green : Colors.grey,
                  ),
                  title: const Text('Authentification à deux facteurs'),
                  subtitle: Text(user.is2faEnabled ? 'Activée' : 'Désactivée'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.tonal(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red.shade50,
              foregroundColor: Colors.red.shade700,
            ),
            child: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
  }

  void _openEditProfile(BuildContext context, WidgetRef ref, MeUser user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _EditProfileSheet(user: user),
    );
  }

  void _openChangePassword(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _ChangePasswordSheet(),
    );
  }
}

class _EditProfileSheet extends ConsumerStatefulWidget {
  const _EditProfileSheet({required this.user});
  final MeUser user;

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  late final _firstName = TextEditingController(text: widget.user.firstName);
  late final _lastName = TextEditingController(text: widget.user.lastName);
  late final _phone = TextEditingController(text: widget.user.phone ?? '');
  late final _jobTitle = TextEditingController(text: widget.user.jobTitle ?? '');
  late final _bio = TextEditingController(text: widget.user.bio ?? '');
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _jobTitle.dispose();
    _bio.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final updated = await ref.read(accountRepositoryProvider).updateProfile({
        'first_name': _firstName.text.trim(),
        'last_name': _lastName.text.trim(),
        'phone': _phone.text.trim(),
        'job_title': _jobTitle.text.trim(),
        'bio': _bio.text.trim(),
      });
      ref.read(authControllerProvider.notifier).setUser(updated);
      if (mounted) Navigator.of(context).pop();
    } on DioException catch (e) {
      setState(() => _error = toApiException(e).message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 8, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Modifier mon profil', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(controller: _firstName, decoration: const InputDecoration(labelText: 'Prénom')),
          const SizedBox(height: 12),
          TextField(controller: _lastName, decoration: const InputDecoration(labelText: 'Nom')),
          const SizedBox(height: 12),
          TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Téléphone')),
          const SizedBox(height: 12),
          TextField(controller: _jobTitle, decoration: const InputDecoration(labelText: 'Fonction')),
          const SizedBox(height: 12),
          TextField(
            controller: _bio,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Bio'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }
}

class _ChangePasswordSheet extends ConsumerStatefulWidget {
  const _ChangePasswordSheet();

  @override
  ConsumerState<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends ConsumerState<_ChangePasswordSheet> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  bool _saving = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(accountRepositoryProvider).changePassword(
            currentPassword: _current.text,
            newPassword: _next.text,
          );
      setState(() => _success = 'Mot de passe mis à jour.');
    } on DioException catch (e) {
      setState(() => _error = toApiException(e).message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 8, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Changer mon mot de passe', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _current,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Mot de passe actuel'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _next,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Nouveau mot de passe'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          if (_success != null) ...[
            const SizedBox(height: 12),
            Text(_success!, style: const TextStyle(color: Colors.green)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _saving ? null : _submit,
            child: _saving
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Valider'),
          ),
        ],
      ),
    );
  }
}
