import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ErrorText } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CONVERSATION_SELECT, conversationTitle, type ConversationRow } from '@/lib/chats';
import { formatTime } from '@/lib/format';
import { pickImage, signedChatImageUrl, uploadImage } from '@/lib/images';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const theme = useTheme();
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addMessage(message: Message) {
    setMessages((current) =>
      current?.some((item) => item.id === message.id) ? current : [...(current ?? []), message],
    );
  }

  useEffect(() => {
    (async () => {
      const [conversationResult, messagesResult] = await Promise.all([
        supabase.from('conversations').select(CONVERSATION_SELECT).eq('id', id).maybeSingle<ConversationRow>(),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', id)
          .order('created_at', { ascending: false })
          .limit(200)
          .returns<Message[]>(),
      ]);
      setConversation(conversationResult.data);
      setMessages((messagesResult.data ?? []).reverse());
      setError(conversationResult.error?.message ?? messagesResult.error?.message ?? null);
    })();

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => addMessage(payload.new as Message),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const names = useMemo(
    () =>
      Object.fromEntries(
        (conversation?.conversation_members ?? []).map((member) => [member.user_id, member.profile?.full_name ?? '']),
      ),
    [conversation],
  );
  const isGroup = Boolean(conversation?.match);

  async function send(content: { body?: string; image_path?: string }) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_id: userId, ...content })
      .select()
      .single<Message>();
    if (error) throw error;
    addMessage(data);
  }

  async function sendText() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      await send({ body });
      setText('');
    } catch (e) {
      setError((e as Error).message);
    }
    setSending(false);
  }

  async function sendImage() {
    const asset = await pickImage();
    if (!asset) return;
    setSending(true);
    setError(null);
    try {
      const path = await uploadImage('chat-images', id, asset);
      await send({ image_path: path });
    } catch (e) {
      setError((e as Error).message);
    }
    setSending(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={process.env.EXPO_OS === 'ios' ? 100 : 0}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: conversation ? conversationTitle(conversation, userId) : 'Chat',
          headerRight: conversation?.match
            ? () => (
                <Pressable onPress={() => router.push(`/partido/${conversation.match!.id}`)} hitSlop={8}>
                  <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
                </Pressable>
              )
            : undefined,
        }}
      />

      {messages === null ? (
        <ActivityIndicator style={styles.flex} color={theme.primary} />
      ) : messages.length === 0 ? (
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Escribe el primer mensaje.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Bubble message={item} mine={item.sender_id === userId} sender={isGroup ? names[item.sender_id] : undefined} />
          )}
        />
      )}

      <View style={[styles.composerWrap, { borderTopColor: theme.border }]}>
        <ErrorText message={error} />
        <View style={styles.composer}>
          <Pressable accessibilityLabel="Enviar foto" onPress={sendImage} disabled={sending} hitSlop={8}>
            <Ionicons name="image-outline" size={26} color={theme.primary} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Mensaje"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <Pressable
            accessibilityLabel="Enviar"
            onPress={sendText}
            disabled={sending || !text.trim()}
            style={[styles.send, { backgroundColor: theme.primary, opacity: sending || !text.trim() ? 0.5 : 1 }]}>
            {sending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Ionicons name="send" size={18} color={theme.onPrimary} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, mine, sender }: { message: Message; mine: boolean; sender?: string }) {
  const theme = useTheme();
  const color = mine ? theme.onBubbleMine : theme.text;
  return (
    <View
      style={[
        styles.bubble,
        mine
          ? { alignSelf: 'flex-end', backgroundColor: theme.bubbleMine }
          : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement },
      ]}>
      {!mine && sender && (
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          {sender}
        </ThemedText>
      )}
      {message.image_path && <ChatImage path={message.image_path} />}
      {message.body && <ThemedText style={{ color }}>{message.body}</ThemedText>}
      <ThemedText type="small" style={[styles.time, { color, opacity: 0.7 }]}>
        {formatTime(new Date(message.created_at))}
      </ThemedText>
    </View>
  );
}

function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    signedChatImageUrl(path).then(setUrl, () => setUrl(null));
  }, [path]);
  if (!url) return <View style={styles.image} />;
  return <Image source={{ uri: url }} style={styles.image} contentFit="cover" />;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  empty: {
    textAlign: 'center',
    marginVertical: Spacing.five,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  time: {
    fontSize: 11,
    lineHeight: 14,
    alignSelf: 'flex-end',
  },
  image: {
    width: 220,
    height: 165,
    borderRadius: Radius.medium,
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
