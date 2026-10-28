/// Reflète `MeSerializer` côté backend (`apps/accounts/serializers.py`).
class MeUser {
  MeUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.roleName,
    this.department,
    this.isSuperAdmin = false,
    this.status,
    this.avatarUrl,
    this.jobTitle,
    this.bio,
    this.is2faEnabled = false,
    this.permissions = const [],
  });

  factory MeUser.fromJson(Map<String, dynamic> json) {
    final roleDetail = json['role_detail'] as Map<String, dynamic>?;
    return MeUser(
      id: json['id'].toString(),
      email: json['email'] as String,
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      phone: json['phone'] as String?,
      roleName: roleDetail?['name'] as String?,
      department: json['department']?.toString(),
      isSuperAdmin: json['is_super_admin'] as bool? ?? false,
      status: json['status'] as String?,
      avatarUrl: json['avatar'] as String?,
      jobTitle: json['job_title'] as String?,
      bio: json['bio'] as String?,
      is2faEnabled: json['is_2fa_enabled'] as bool? ?? false,
      permissions: (json['permissions'] as List?)?.cast<String>() ?? const [],
    );
  }

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? roleName;
  final String? department;
  final bool isSuperAdmin;
  final String? status;
  final String? avatarUrl;
  final String? jobTitle;
  final String? bio;
  final bool is2faEnabled;
  final List<String> permissions;

  String get fullName => '$firstName $lastName'.trim();

  bool hasPermission(String code) => isSuperAdmin || permissions.contains(code);
}
