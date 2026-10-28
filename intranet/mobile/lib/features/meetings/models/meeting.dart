class PollOption {
  PollOption({required this.id, required this.label, required this.voteCount});
  factory PollOption.fromJson(Map<String, dynamic> json) => PollOption(
        id: json['id'] as int,
        label: json['label'] as String? ?? '',
        voteCount: json['vote_count'] as int? ?? 0,
      );
  final int id;
  final String label;
  final int voteCount;
}

/// Reflète `MeetingPollSerializer`.
class MeetingPoll {
  MeetingPoll({
    required this.id,
    required this.question,
    required this.isOpen,
    required this.options,
    this.myVote,
  });

  factory MeetingPoll.fromJson(Map<String, dynamic> json) {
    return MeetingPoll(
      id: json['id'] as int,
      question: json['question'] as String? ?? '',
      isOpen: json['is_open'] as bool? ?? false,
      options: (json['options'] as List? ?? [])
          .map((e) => PollOption.fromJson(e as Map<String, dynamic>))
          .toList(),
      myVote: json['my_vote'] as int?,
    );
  }

  final int id;
  final String question;
  final bool isOpen;
  final List<PollOption> options;
  final int? myVote;
}

class MeetingParticipant {
  MeetingParticipant({required this.name, required this.response, required this.isOrganizer});
  factory MeetingParticipant.fromJson(Map<String, dynamic> json) => MeetingParticipant(
        name: json['name'] as String? ?? json['email'] as String? ?? '',
        response: json['response'] as String?,
        isOrganizer: json['is_organizer'] as bool? ?? false,
      );
  final String name;
  final String? response; // accepted | declined | tentative | null (en attente)
  final bool isOrganizer;
}

/// Reflète `MeetingSerializer` (`apps/meetings/serializers.py`).
class Meeting {
  Meeting({
    required this.id,
    required this.title,
    required this.description,
    required this.organizerName,
    required this.start,
    required this.end,
    required this.status,
    required this.statusDisplay,
    required this.participants,
    required this.polls,
    this.agenda,
    this.minutes,
  });

  factory Meeting.fromJson(Map<String, dynamic> json) {
    return Meeting(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      organizerName: json['organizer_name'] as String? ?? '',
      start: DateTime.parse(json['start'] as String),
      end: DateTime.parse(json['end'] as String),
      status: json['status'] as String? ?? '',
      statusDisplay: json['status_display'] as String? ?? '',
      agenda: json['agenda'] as String?,
      minutes: json['minutes'] as String?,
      participants: (json['meeting_participants'] as List? ?? [])
          .map((e) => MeetingParticipant.fromJson(e as Map<String, dynamic>))
          .toList(),
      polls: (json['polls'] as List? ?? [])
          .map((e) => MeetingPoll.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final int id;
  final String title;
  final String description;
  final String organizerName;
  final DateTime start;
  final DateTime end;
  final String status;
  final String statusDisplay;
  final String? agenda;
  final String? minutes;
  final List<MeetingParticipant> participants;
  final List<MeetingPoll> polls;

  bool get isPast => end.isBefore(DateTime.now());
}

/// Réponse de l'action `/meetings/{id}/join/`.
class MeetingJoinInfo {
  MeetingJoinInfo({required this.url, required this.jwt, required this.configured});
  factory MeetingJoinInfo.fromJson(Map<String, dynamic> json) => MeetingJoinInfo(
        url: json['url'] as String? ?? '',
        jwt: json['jwt'] as String?,
        configured: json['configured'] as bool? ?? false,
      );
  final String url;
  final String? jwt;
  final bool configured;
}
