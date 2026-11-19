import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KassaBackground from '@/components/KassaBackground';
import { callSupport } from '@/components/kassa-demo/support-contact';
import { useKassaSession } from '@/components/kassa-demo/api';
import { C } from '@/components/kassa-demo/theme';

type SupportMessage = {
  id: string; body: string; createdAt: string;
  fromSupport: boolean; senderName: string;
};
type SupportThread = { id: string | null; status: string; messages: SupportMessage[] };
const suggestions = ['Refund a sale', 'Printer issue', 'Sync problem'] as const;

export default function ChatSupport() {
  const router = useRouter();
  const session = useKassaSession();
  const insets = useSafeAreaInsets();
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!session.user) {
      if (isCurrent()) setError('Sign in to send a message to KASSA support.');
      return;
    }
    try {
      const thread = await session.request<SupportThread>('support/my-thread');
      if (!Array.isArray(thread.messages)) throw new Error('Unexpected support response.');
      if (isCurrent()) {
        setMessages(thread.messages);
        setError('');
      }
    } catch (cause) {
      if (isCurrent()) setError(cause instanceof Error ? cause.message : 'Support is unavailable.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [session.user?.id, session.request]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void refresh(() => active);
    const timer = setInterval(() => { void refresh(() => active); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh]));

  const send = async (suggested?: string) => {
    const text = (suggested ?? draft).trim();
    if (!text || text.length > 1000 || working || !session.user) return;
    setWorking(true);
    setError('');
    try {
      await session.request('support/message', { body: text });
      setDraft('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Message was not sent. Check your connection.');
    } finally {
      setWorking(false);
    }
  };

  return <KassaBackground>
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 12) + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to help"
          onPress={() => router.back()} style={s.back}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            tintColor={C.text} size={22}/>
        </Pressable>
        <View style={s.avatar}><Text style={s.avatarLetter}>K</Text></View>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>Kassa Support</Text>
          <Text style={s.status}>Messages are sent to the support inbox</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Call support"
          style={s.phone} onPress={callSupport}>
          <SymbolView name={{ ios: 'phone', android: 'call', web: 'call' }}
            size={21} tintColor={C.green}/>
        </Pressable>
      </View>

      <ScrollView ref={scroller} style={s.messages} contentContainerStyle={s.messageContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
        <View style={s.datePill}><Text style={s.dateText}>KASSA SUPPORT</Text></View>
        {loading && !messages.length && <Text style={s.info}>Loading your messages…</Text>}
        {!loading && !messages.length && <View style={s.welcome}>
          <Text style={s.welcomeTitle}>How can we help you?</Text>
          <Text style={s.info}>Send a message to our support inbox. Replies appear here when an authorized agent responds. Response times may vary.</Text>
          <View style={s.suggestions}>{suggestions.map(topic =>
            <Pressable key={topic} onPress={() => { void send(topic); }} disabled={working}
              style={s.chip} accessibilityRole="button">
              <Text style={s.chipText}>{topic}</Text>
            </Pressable>
          )}</View>
        </View>}
        {messages.map(message => <View key={message.id}
          style={[s.messageBlock, message.fromSupport ? s.incomingBlock : s.outgoingBlock]}>
          <View style={[s.bubble, !message.fromSupport && s.outgoing]}>
            {message.fromSupport && <Text style={s.sender}>{message.senderName}</Text>}
            <Text style={[s.messageText, !message.fromSupport && s.outgoingText]}>{message.body}</Text>
          </View>
          <Text style={[s.timestamp, !message.fromSupport && s.sentTime]}>
            {new Date(message.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
          </Text>
        </View>)}
      </ScrollView>

      {error ? <View style={s.errorBar}><Text style={s.errorText}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void refresh(); }}>
          <Text style={s.retry}>Retry</Text>
        </Pressable></View> : null}
      <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput accessibilityLabel="Type support message"
          value={draft} onChangeText={setDraft} placeholder="Type a message..."
          placeholderTextColor={C.faint} style={s.input} multiline maxLength={1000}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Send message"
          disabled={!draft.trim() || working || !session.user}
          onPress={() => { void send(); }}
          style={[s.send, (!draft.trim() || working || !session.user) && { opacity: 0.5 }]}>
          <SymbolView name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
            tintColor={C.white} size={20}/>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </KassaBackground>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 13, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 25, height: 35, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 37, height: 37, borderRadius: 19, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: C.white, fontSize: 20, fontWeight: '800' },
  headerInfo: { flex: 1 },
  headerTitle: { color: C.title, fontSize: 22, fontWeight: '800' },
  status: { color: C.muted, fontSize: 12, marginTop: 3 },
  phone: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1 },
  messageContent: { padding: 15, paddingBottom: 22 },
  datePill: { alignSelf: 'center', backgroundColor: C.mint, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 7, marginBottom: 17 },
  dateText: { color: C.greenDark, fontSize: 12, fontWeight: '800' },
  welcome: { borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, padding: 17 },
  welcomeTitle: { color: C.title, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  info: { color: C.muted, fontSize: 14, lineHeight: 22 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: C.mint, borderWidth: 1, borderColor: C.mintBorder },
  chipText: { color: C.green, fontSize: 13, fontWeight: '700' },
  messageBlock: { marginBottom: 14 },
  incomingBlock: { alignItems: 'flex-start' },
  outgoingBlock: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 15, paddingVertical: 13 },
  outgoing: { backgroundColor: C.green, borderColor: C.green },
  sender: { color: C.green, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  messageText: { color: C.title, fontSize: 14, lineHeight: 21 },
  outgoingText: { color: C.white },
  timestamp: { color: C.faint, fontSize: 11, marginTop: 5 },
  sentTime: { textAlign: 'right' },
  errorBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#FFF3ED' },
  errorText: { flex: 1, color: C.danger, fontSize: 13 },
  retry: { color: C.green, fontWeight: '800', fontSize: 14, marginLeft: 12 },
  composer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingTop: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  input: { flex: 1, minHeight: 42, maxHeight: 112, backgroundColor: C.background, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingVertical: 10, paddingHorizontal: 14, color: C.title, fontSize: 14 },
  send: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green },
});
