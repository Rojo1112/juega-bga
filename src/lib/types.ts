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
