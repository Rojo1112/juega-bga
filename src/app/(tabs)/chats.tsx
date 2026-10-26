import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, EmptyState, ErrorText, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CONVERSATION_SELECT, conversationTitle, type ConversationListRow } from '@/lib/chats';
import { formatRelative } from '@/lib/format';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

function lastActivity(conversation: ConversationListRow) {
  return conversation.messages[0]?.created_at ?? conversation.created_at;
}

export default function ChatsScreen() {
  const userId = useUserId();
  const theme = useTheme();
  const [conversations, setConversations] = useState<ConversationListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select(`${CONVERSATION_SELECT}, messages(body, image_path, created_at)`)
          .order('created_at', { referencedTable: 'messages', ascending: false })
          .limit(1, { referencedTable: 'messages' })
          .returns<ConversationListRow[]>();
        if (!active) return;
        setError(error?.message ?? null);
        setConversations((data ?? []).sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))));
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen>
      <ErrorText message={error} />
      {conversations === null ? (
        <ActivityIndicator color={theme.primary} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Todavía no tienes chats"
          message="Cuando te acepten en un partido, aquí aparece el chat del grupo. También puedes escribirle a un jugador desde su perfil."
        />
      ) : (
        conversations.map((conversation) => {
          const title = conversationTitle(conversation, userId);
          const last = conversation.messages[0];
          const preview = last ? (last.body ?? '📷 Foto') : 'Sin mensajes todavía';
          return (
            <Pressable
              key={conversation.id}
              onPress={() => router.push(`/chat/${conversation.id}`)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.backgroundElement },
                pressed && { opacity: 0.8 },
              ]}>
              {conversation.match ? (
                <View style={[styles.groupIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="people" size={20} color={theme.primary} />
                </View>
              ) : (
                <Avatar name={title} />
              )}
              <View style={styles.text}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {preview}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {formatRelative(lastActivity(conversation))}
              </ThemedText>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
