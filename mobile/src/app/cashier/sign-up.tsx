import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/components/kassa-demo/theme';
import { KButton, KCard, KField, KScreen } from '@/components/kassa-demo/ui';

export default function SignUpPreview() {
  const router = useRouter();
  const [business, setBusiness] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const validate = () => {
    if (!business.trim() || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
      Alert.alert('Check the form', 'Enter the business name, full name, valid email and a password of at least 12 characters.');
      return;
    }
    Alert.alert('Registration preview', 'Your form looks valid. No account has been created; this mobile screen is not yet connected to KASSA authentication.');
  };
  return <KScreen title="Create your account" subtitle="Set up your Kassa account to get started." nav={false} back>
    <KCard style={{ backgroundColor: C.mint, borderColor: C.mintBorder }}>
      <Text style={{ fontSize: 12, color: C.greenDark }}>This screen follows the Figma registration layout. Submitting validates locally only.</Text>
    </KCard>
    <KField label="Business name" value={business} onChangeText={setBusiness} placeholder="Enter business name" />
    <KField label="Full name" value={name} onChangeText={setName} placeholder="Enter your full name" />
    <KField label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
    <KField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!visible} placeholder="Create a password" />
    <Pressable onPress={() => setVisible(v => !v)} style={{ alignSelf: 'flex-end', marginTop: -9, marginBottom: 20 }}><Text style={{ color: C.green, fontWeight: '700' }}>{visible ? 'Hide password' : 'Show password'}</Text></Pressable>
    <KButton text="Create account" onPress={validate} />
    <Text style={{ color: C.muted, textAlign: 'center', marginTop: 26, marginBottom: 8, fontSize: 12 }}>Or continue with</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
      <Pressable onPress={() => Alert.alert('Not connected', 'Google sign-up is not configured yet.')} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 30, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: C.white }}><Text style={{ fontSize: 21, fontWeight: '700' }}>G</Text></Pressable>
      <Pressable onPress={() => Alert.alert('Not connected', 'Apple sign-up is not configured yet.')} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 30, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: C.white }}><Text style={{ fontSize: 21, fontWeight: '700' }}>●</Text></Pressable>
    </View>
    <Pressable style={{ paddingVertical: 25 }} onPress={() => router.replace('/login')}><Text style={{ textAlign: 'center', fontSize: 12, color: C.muted }}>Already have an account? <Text style={{ color: C.green, fontWeight: '800' }}>Log in</Text></Text></Pressable>
    <Text style={{ color: C.muted, textAlign: 'center', fontSize: 10 }}>By continuing, you agree to Kassa's Terms & Privacy Policy.</Text>
  </KScreen>;
}
