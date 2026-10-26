import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type SessionState = { session: Session | null; loading: boolean };

const SessionContext = createContext<SessionState>({ session: null, loading: true });

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession() {
  return useContext(SessionContext);
}

/** Id del usuario con sesión. Solo para pantallas protegidas. */
export function useUserId() {
  const { session } = useSession();
  if (!session) throw new Error('useUserId se usó sin sesión');
  return session.user.id;
}
