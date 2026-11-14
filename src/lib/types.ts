// Tipos de las tablas de supabase/schema.sql.

export type SportId = 'futbol' | 'padel' | 'pickleball' | 'tenis' | 'baloncesto' | 'voleibol';
export type SkillLevel = 'principiante' | 'intermedio' | 'avanzado';
export type MatchStatus = 'abierto' | 'completo' | 'cancelado';
export type MemberStatus = 'pendiente' | 'aceptado' | 'rechazado' | 'en_espera';

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  neighborhood: string | null;
};

export type UserSport = {
  user_id: string;
  sport_id: SportId;
  level: SkillLevel;
};

export type Venue = {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  sport_ids: SportId[];
  easycancha_url: string | null;
  owner_id: string | null;
  phone: string | null;
  approved: boolean;
};

export type Court = {
  id: string;
  venue_id: string;
  name: string;
  sport_id: SportId;
  price_per_slot: number;
  slot_minutes: number;
  active: boolean;
};

export type CourtHours = {
  court_id: string;
  weekday: number;
  /** Llegan como 'HH:MM:SS'. */
  opens: string;
  closes: string;
};

export type Booking = {
  id: string;
  court_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  price: number;
  status: 'confirmada' | 'cancelada';
  paid_at: string | null;
};

export type AdPlacement = 'inicio' | 'canchas' | 'comunidad';

export type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  placement: AdPlacement;
};

export type Match = {
  id: string;
  creator_id: string;
  sport_id: SportId;
  venue_id: string | null;
  place_text: string | null;
  starts_at: string;
  players_needed: number;
  price_per_player: number;
  level: SkillLevel | null;
  notes: string | null;
  status: MatchStatus;
  created_at: string;
};

export type MatchMember = {
  match_id: string;
  user_id: string;
  status: MemberStatus;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_path: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  sport_id: SportId | null;
  body: string;
  image_path: string | null;
  created_at: string;
};
