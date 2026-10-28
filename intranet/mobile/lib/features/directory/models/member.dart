/// Reflète `MemberSerializer` (`apps/accounts/serializers.py`).
class Member {
  Member({
    required this.id,
    required this.fullName,
    required this.email,
    this.phone,
    this.avatarUrl,
    this.roleName,
    this.departmentName,
    this.jobTitle,
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['id'].toString(),
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      avatarUrl: json['avatar'] as String?,
      roleName: json['role_name'] as String?,
      departmentName: json['department_name'] as String?,
      jobTitle: json['job_title'] as String?,
    );
  }

  final String id;
  final String fullName;
  final String email;
  final String? phone;
  final String? avatarUrl;
  final String? roleName;
  final String? departmentName;
  final String? jobTitle;

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    final first = parts.first[0];
    final last = parts.length > 1 && parts.last.isNotEmpty ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }
}
