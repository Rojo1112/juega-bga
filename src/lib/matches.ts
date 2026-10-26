import type { Match, MatchMember, Profile, Venue } from '@/lib/types';

// matches y profiles se unen de dos formas (creador y participantes), por eso se nombra la llave.
export const MATCH_LIST_SELECT =
  '*, creator:profiles!matches_creator_id_fkey(id, full_name), venue:venues(*), match_members(status)';

export const MATCH_DETAIL_SELECT =
  '*, creator:profiles!matches_creator_id_fkey(id, full_name), venue:venues(*), ' +
  'match_members(*, profile:profiles!match_members_user_id_fkey(id, full_name))';

export type MatchListRow = Match & {
  creator: Pick<Profile, 'id' | 'full_name'> | null;
  venue: Venue | null;
  match_members: Pick<MatchMember, 'status'>[];
};

export type MatchDetailRow = Match & {
  creator: Pick<Profile, 'id' | 'full_name'> | null;
  venue: Venue | null;
  match_members: (MatchMember & { profile: Pick<Profile, 'id' | 'full_name'> | null })[];
};

/** Cupos libres: players_needed no cuenta a quien convoca, que siempre está aceptado. */
export function spotsLeft(match: Match, members: Pick<MatchMember, 'status'>[]) {
  const accepted = members.filter((member) => member.status === 'aceptado').length;
  return Math.max(0, match.players_needed - (accepted - 1));
}

export function placeName(match: Match & { venue: Venue | null }) {
  return match.venue?.name ?? match.place_text ?? 'Lugar por definir';
}
