import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C } from '@/components/kassa-demo/theme';
import { KScreen, KCard, KLinkRow, KButton, SectionTitle } from '@/components/kassa-demo/ui';

export default function Profile() {
  const router=useRouter();
  const {branch}=useKassaDemo();
  return <KScreen title="Profile" subtitle="Your cashier profile and account settings.">
    <KCard><View style={s.heading}><View style={s.avatar}><Text style={{ color:C.white,fontWeight:'800',fontSize:18 }}>JD</Text></View><View><Text style={s.name}>John Doe</Text><Text style={s.sub}>Cashier account · Sample profile</Text><Text style={[s.sub,{color:C.green}]}>{branch}</Text></View></View></KCard>
    <SectionTitle>Account</SectionTitle>
    <KCard>
      <KLinkRow title="Switch branch" subtitle={branch} onPress={()=>router.push('/cashier/switch-branch')}/>
      <KLinkRow title="Change password" subtitle="Password and security" onPress={()=>router.push('/cashier/change-password')}/>
      <KLinkRow title="Help and support" subtitle="Frequently asked questions and contact" onPress={()=>router.push('/cashier/help')}/>
      <KLinkRow title="Chat support" subtitle="Try a local chat conversation preview" onPress={()=>router.push('/cashier/chat')}/>
    </KCard>
    <KButton variant="outline" text="Return to login preview" onPress={()=>Alert.alert('Preview mode','This does not sign you out of any real session.',[{text:'Cancel'},{text:'Go to login',onPress:()=>router.replace('/login')}])}/>
  </KScreen>;
}
const s=StyleSheet.create({
  heading:{flexDirection:'row',alignItems:'center',gap:14},avatar:{height:56,width:56,borderRadius:28,backgroundColor:C.green,alignItems:'center',justifyContent:'center'},
  name:{fontSize:18,fontWeight:'800',color:C.title},sub:{color:C.muted,fontSize:12,marginTop:5}
});
