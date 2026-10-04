export interface FeedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  color: string;
  all_day: boolean;
  editable: boolean;
  location: string;
  url: string;
  source_id: number | null;
  description?: string;
  priority?: string;
  overdue?: boolean;
  status?: string;
}

export interface CalendarEvent {
  id: number;
  owner: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  all_day: boolean;
  type: string;
  visibility: string;
  color: string;
  display_color: string;
  recurrence_rule: string;
  reminders: { id: number; minutes_before: number; channel: string }[];
  event_attendees: { id: number; email: string; name: string; response: string }[];
  my_response: string | null;
}

export interface MeetingParticipant {
  id: number;
  email: string;
  name: string;
  response: string;
  is_organizer: boolean;
}

export interface MeetingPoll {
  id: number;
  question: string;
  is_open: boolean;
  options: { id: number; label: string; vote_count: number }[];
  my_vote: number | null;
}

export interface Meeting {
  id: number;
  title: string;
  description: string;
  organizer: string;
  organizer_name: string;
  start: string;
  end: string;
  room_slug: string;
  access: string;
  lobby: boolean;
  agenda: string;
  minutes: string;
  minutes_document_detail: { id: number; title: string } | null;
  status: string;
  status_display: string;
  join_url: string;
  meeting_participants: MeetingParticipant[];
  polls: MeetingPoll[];
}

export const EVENT_TYPE_LABEL: Record<string, string> = {
  personal: "Personnel",
  task: "Tâche",
  meeting: "Réunion",
  leave: "Congé",
  reminder: "Rappel",
};
