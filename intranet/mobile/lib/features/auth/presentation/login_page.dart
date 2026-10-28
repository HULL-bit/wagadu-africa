import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../data/auth_repository.dart';
import '../state/auth_controller.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _totpController = TextEditingController();

  bool _needs2fa = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _totpController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    final result = await ref.read(authControllerProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          totpCode: _needs2fa ? _totpController.text.trim() : null,
        );

    if (!mounted) return;
    setState(() {
      _submitting = false;
      if (result is LoginNeeds2fa) {
        _needs2fa = true;
      } else if (result is LoginFailure) {
        _error = result.message;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Image.asset('assets/brand/logo.png', height: 96),
                    const SizedBox(height: 16),
                    Text(
                      'Wagadu Hub',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Portail interne de Wagadu Africa',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: WagaduColors.ebony.withValues(alpha: 0.6),
                          ),
                    ),
                    const SizedBox(height: 32),
                    if (!_needs2fa) ...[
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(labelText: 'E-mail'),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'E-mail requis' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        autofillHints: const [AutofillHints.password],
                        decoration: const InputDecoration(labelText: 'Mot de passe'),
                        validator: (v) =>
                            (v == null || v.isEmpty) ? 'Mot de passe requis' : null,
                        onFieldSubmitted: (_) => _submit(),
                      ),
                    ] else ...[
                      Text(
                        'Code de vérification à deux facteurs',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _totpController,
                        keyboardType: TextInputType.number,
                        autofocus: true,
                        decoration: const InputDecoration(labelText: 'Code à 6 chiffres'),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Code requis' : null,
                        onFieldSubmitted: (_) => _submit(),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: _submitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(_needs2fa ? 'Vérifier' : 'Se connecter'),
                    ),
                    if (_needs2fa) ...[
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: _submitting
                            ? null
                            : () => setState(() {
                                  _needs2fa = false;
                                  _totpController.clear();
                                  _error = null;
                                }),
                        child: const Text('Retour'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
