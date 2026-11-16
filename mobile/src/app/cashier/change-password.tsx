import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from '@/components/kassa-demo/api';
import { C } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

type PasswordFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText(value: string): void;
  visible: boolean;
  onToggle(): void;
};
function PasswordField({ label, placeholder, value, onChangeText, visible, onToggle }: PasswordFieldProps) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <View style={s.inputWrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        style={s.input}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide ' + label : 'Show ' + label}
        onPress={onToggle} style={s.eyeButton}>
        <SymbolView name={visible
          ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
          : { ios: 'eye', android: 'visibility', web: 'visibility' }}
          size={19} tintColor={C.muted} />
      </Pressable>
    </View>
  </View>;
}

export default function ChangePassword() {
  const session = useKassaSession();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState([false, false, false]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toggle = (index: number) => setShow(prev => prev.map((v, i) => i === index ? !v : v));

  const save = async () => {
    if (saving) return;
    if (!session.user) { setError('Sign in to change your password.'); return; }
    if (!oldPassword || newPassword.length < 12 || newPassword.length > 128) {
      setError('Enter your current password and a new password of 12–128 characters.'); return;
    }
    if (newPassword === oldPassword) { setError('Choose a different new password.'); return; }
    if (confirm !== newPassword) { setError('New passwords do not match.'); return; }
    setSaving(true); setError('');
    try {
      const result = await session.request<{ changed: boolean }>('auth/change-password', {
        currentPassword: oldPassword,
        newPassword,
      });
      if (result.changed !== true) throw new Error('Password update could not be confirmed.');
      setOldPassword(''); setNewPassword(''); setConfirm('');
      await session.signOut();
      Alert.alert('Password updated', 'Sign in again with your new password.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change password.');
    } finally { setSaving(false); }
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <Text style={s.title}>Profile</Text>
    <Text style={s.subtitle}>Account &amp; Settings</Text>
    <View style={s.form}>
      <PasswordField label="Old Password" placeholder="Enter old password" value={oldPassword}
        onChangeText={setOldPassword} visible={show[0]} onToggle={() => toggle(0)}/>
      <PasswordField label="New Password" placeholder="Enter new password" value={newPassword}
        onChangeText={setNewPassword} visible={show[1]} onToggle={() => toggle(1)}/>
      <PasswordField label="Confirm New Password" placeholder="Re-enter new password" value={confirm}
        onChangeText={setConfirm} visible={show[2]} onToggle={() => toggle(2)}/>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }}
        style={[s.save, saving && { opacity: 0.6 }]}>
        <Text style={s.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </View>
  </KScreen>;
}

const s = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: C.title },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  form: { marginTop: 27 },
  field: { marginBottom: 17 },
  label: { fontSize: 14, color: C.title, fontWeight: '800', marginBottom: 10 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, height: 58, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, minWidth: 0, height: 56, paddingLeft: 15, fontSize: 14, color: C.title },
  eyeButton: { width: 47, height: 49, alignItems: 'center', justifyContent: 'center' },
  save: { minHeight: 50, borderRadius: 9, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  saveText: { color: C.white, fontSize: 14, fontWeight: '800' },
  error: { color: C.danger, marginBottom: 12, fontSize: 14, lineHeight: 22 },
});
