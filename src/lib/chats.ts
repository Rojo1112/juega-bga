import { sportById } from '@/constants/sports';
import { formatMatchDate } from '@/lib/format';
import type { Match, Message, Profile } from '@/lib/types';

export const CONVERSATION_SELECT =
  'id, created_at, match:matches(id, sport_id, starts_at), ' +
  'conversation_members(user_id, profile:profiles(id, full_name))';

export type ConversationRow = {
  id: string;
  created_at: string;
  match: Pick<Match, 'id' | 'sport_id' | 'starts_at'> | null;
  conversation_members: { user_id: string; profile: Pick<Profile, 'id' | 'full_name'> | null }[];
};

export type ConversationListRow = ConversationRow & {
  messages: Pick<Message, 'body' | 'image_path' | 'created_at'>[];
};

/** Partido: "Fútbol · sáb 1 nov · 7:00 p. m."; chat directo: el nombre de la otra persona. */
export function conversationTitle(conversation: ConversationRow, userId: string) {
  if (conversation.match) {
    const sport = sportById(conversation.match.sport_id);
    return `${sport?.name ?? 'Partido'} · ${formatMatchDate(conversation.match.starts_at)}`;
  }
  const other = conversation.conversation_members.find((member) => member.user_id !== userId);
  return other?.profile?.full_name || 'Chat';
}
