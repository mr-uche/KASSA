import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KassaBackground from '@/components/KassaBackground';
import { callSupport } from '@/components/kassa-demo/support-contact';
import { C } from '@/components/kassa-demo/theme';

type Message = { id: number; outgoing: boolean; text: string; time: string };
const suggestions = ['Refund a sale', 'Printer issue', 'Sync problem'] as const;

function replyTo(input: string): string {
  const text = input.toLowerCase();
  if (/(refund|void|reverse)/.test(text)) {
    return 'A cashier cannot currently reverse a payment in this mobile app. Please contact your business manager with the sale reference for help.';
  }
  if (/(print|printer|receipt|bluetooth)/.test(text)) {
    return 'Please check that Bluetooth is enabled and your printer is paired. Make sure it has paper and power. You can also open a confirmed receipt and choose Print receipt. Would you like to try those steps?';
  }
  if (/(sync|offline|network|internet)/.test(text)) {
    return 'Mobile offline sales are not enabled yet. Check your internet connection, then refresh the Products or Sales screen. Do not repeat a pending payment until its status has been verified.';
  }
  return 'This is an automated local demo, not a live support agent. Try a suggested topic above, or return to Help & Support to contact the team using configured channels.';
}

export default function ChatSupport() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const nextId = useRef(2);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([{
    id: 1, outgoing: false,
    text: 'Hi, welcome to Kassa Support. How can we help you today?',
    time: '',
  }]);

  const send = (suggested?: string) => {
    const text = (suggested ?? draft).trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      { id: nextId.current++, outgoing: true, text, time },
      { id: nextId.current++, outgoing: false, text: replyTo(text), time },
    ]);
    setDraft('');
  };

  return <KassaBackground>
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 12) + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to help"
          onPress={() => router.back()} style={s.back}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={C.text} size={22}/>
        </Pressable>
        <View style={s.avatar}><Text style={s.avatarLetter}>K</Text></View>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>Kassa Support</Text>
          <Text style={s.status}>Automated help • local demo</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Call support" style={s.phone} onPress={callSupport}>
          <SymbolView name={{ ios: 'phone', android: 'call', web: 'call' }} size={21} tintColor={C.green}/>
        </Pressable>
      </View>

      <ScrollView ref={scroller} style={s.messages} contentContainerStyle={s.messageContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
        <View style={s.datePill}><Text style={s.dateText}>Today</Text></View>
        {messages.map((msg, index) => <React.Fragment key={msg.id}>
          <View style={[s.bubble, msg.outgoing && s.outgoing]}>
            <Text style={[s.messageText, msg.outgoing && s.outgoingText]}>{msg.text}</Text>
          </View>
          {!!msg.time && <Text style={[s.timestamp, msg.outgoing && s.sentTime]}>{msg.time}</Text>}
          {index === 0 && <View style={s.suggestions}>
            {suggestions.map(topic => <Pressable accessibilityRole="button" key={topic}
              style={s.chip} onPress={() => send(topic)}>
              <Text style={s.chipText}>{topic}</Text>
            </Pressable>)}
          </View>}
        </React.Fragment>)}
      </ScrollView>

      <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Attach file"
          onPress={() => Alert.alert('Attachments unavailable', 'This local support demo does not upload attachments.')}
          style={s.attach}>
          <SymbolView name={{ ios: 'paperclip', android: 'attach_file', web: 'attach_file' }} tintColor={C.muted} size={21}/>
        </Pressable>
        <TextInput
          accessibilityLabel="Type support message"
          value={draft} onChangeText={setDraft}
          placeholder="Type a message..." placeholderTextColor={C.faint}
          style={s.input} multiline maxLength={1000}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message"
          disabled={!draft.trim()} onPress={() => send()}
          style={[s.send, !draft.trim() && { opacity: 0.5 }]}>
          <SymbolView name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} tintColor={C.white} size={20}/>
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
  avatarLetter: { color: C.white, fontSize: 15, fontWeight: '800' },
  headerInfo: { flex: 1 },
  headerTitle: { color: C.title, fontSize: 14, fontWeight: '800' },
  status: { color: C.green, fontSize: 10, marginTop: 3 },
  phone: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1 },
  messageContent: { padding: 15, paddingBottom: 22 },
  datePill: { backgroundColor: C.mint, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'center', marginVertical: 12 },
  dateText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  bubble: { maxWidth: '85%', alignSelf: 'flex-start', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, borderBottomLeftRadius: 3, padding: 12, marginTop: 10 },
  outgoing: { alignSelf: 'flex-end', backgroundColor: C.green, borderColor: C.green, borderBottomLeftRadius: 13, borderBottomRightRadius: 3 },
  messageText: { fontSize: 12, color: C.text, lineHeight: 18 },
  outgoingText: { color: C.white },
  timestamp: { fontSize: 9, color: C.faint, marginTop: 4 },
  sentTime: { textAlign: 'right' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 13, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: C.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.white },
  chipText: { fontSize: 10, color: C.green, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingHorizontal: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, gap: 9 },
  attach: { width: 32, height: 37, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: '#F6F9F7', flex: 1, minWidth: 0, borderRadius: 22, borderWidth: 1, borderColor: C.border, paddingVertical: 9, paddingHorizontal: 15, color: C.title, minHeight: 43, maxHeight: 110, fontSize: 12 },
  send: { width: 39, height: 39, borderRadius: 20, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
