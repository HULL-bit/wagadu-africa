import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../models/member.dart';
import '../state/directory_provider.dart';

class DirectoryPage extends ConsumerWidget {
  const DirectoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(directoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Annuaire')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Rechercher un·e collègue…',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (value) =>
                  ref.read(directorySearchQueryProvider.notifier).state = value,
            ),
          ),
          Expanded(
            child: membersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => const Center(child: Text('Impossible de charger l\'annuaire.')),
              data: (members) {
                if (members.isEmpty) {
                  return const Center(child: Text('Aucun résultat.'));
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: members.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) => _MemberTile(member: members[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({required this.member});
  final Member member;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: WagaduColors.sand,
        foregroundColor: WagaduColors.ebony,
        backgroundImage: member.avatarUrl != null ? NetworkImage(member.avatarUrl!) : null,
        child: member.avatarUrl == null ? Text(member.initials) : null,
      ),
      title: Text(member.fullName),
      subtitle: Text(
        [member.jobTitle, member.departmentName].where((e) => e != null && e.isNotEmpty).join(' · '),
      ),
      onTap: () => showModalBottomSheet(
        context: context,
        showDragHandle: true,
        builder: (_) => _MemberDetailSheet(member: member),
      ),
    );
  }
}

class _MemberDetailSheet extends StatelessWidget {
  const _MemberDetailSheet({required this.member});
  final Member member;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: WagaduColors.sand,
            backgroundImage: member.avatarUrl != null ? NetworkImage(member.avatarUrl!) : null,
            child: member.avatarUrl == null
                ? Text(member.initials, style: const TextStyle(fontSize: 24))
                : null,
          ),
          const SizedBox(height: 12),
          Text(member.fullName, style: Theme.of(context).textTheme.titleLarge),
          if (member.jobTitle != null) Text(member.jobTitle!),
          const SizedBox(height: 16),
          if (member.departmentName != null) _InfoRow(icon: Icons.apartment, text: member.departmentName!),
          if (member.roleName != null) _InfoRow(icon: Icons.badge_outlined, text: member.roleName!),
          _InfoRow(icon: Icons.email_outlined, text: member.email),
          if (member.phone != null && member.phone!.isNotEmpty)
            _InfoRow(icon: Icons.phone_outlined, text: member.phone!),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: WagaduColors.ebony.withValues(alpha: 0.6)),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
