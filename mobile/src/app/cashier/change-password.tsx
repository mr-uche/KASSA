import React,{useState} from 'react';
import { Alert,Text } from 'react-native';
import { C } from '@/components/kassa-demo/theme';
import { KScreen,KField,KButton,KCard } from '@/components/kassa-demo/ui';
export default function ChangePassword(){
  const [current,setCurrent]=useState('');
  const [newPass,setNewPass]=useState('');
  const [confirm,setConfirm]=useState('');
  const submit=()=>{
    if(!current||newPass.length<12||newPass!==confirm){Alert.alert('Check the form','Enter your existing password, a new password of 12+ characters, and a matching confirmation.');return;}
    Alert.alert('Demo only','The inputs look valid, but no password was changed. Secure authentication is not connected on the mobile preview.');
    setCurrent('');setNewPass('');setConfirm('');
  };
  return <KScreen title="Change password" subtitle="Update your cashier account security." nav={false} back>
    <KCard style={{backgroundColor:C.mint,borderColor:C.mintBorder}}><Text style={{color:C.greenDark,fontSize:12}}>For security, this demo does not store or transmit your passwords. Do not enter real account passwords.</Text></KCard>
    <KField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry placeholder="Current password"/>
    <KField label="New password" value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="Minimum 12 characters"/>
    <KField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password"/>
    <KButton text="Validate form (demo)" onPress={submit}/>
  </KScreen>;
}
