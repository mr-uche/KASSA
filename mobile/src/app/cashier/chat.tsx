import React,{useState} from 'react';
import { Pressable,StyleSheet,Text,TextInput,View } from 'react-native';
import { C } from '@/components/kassa-demo/theme';
import { KScreen,KCard } from '@/components/kassa-demo/ui';
export default function Chat(){
  const [messages,setMessages]=useState([{id:1,text:'Welcome to the KASSA support preview. This conversation stays on your device.',outgoing:false}]);
  const [draft,setDraft]=useState('');
  const send=()=>{if(!draft.trim())return;setMessages(prev=>[...prev,{id:Date.now(),text:draft.trim(),outgoing:true}]);setDraft('');};
  return <KScreen title="Chat Support" subtitle="Local chat UI demo · no messages are sent" back nav={false}>
    <KCard style={{backgroundColor:C.mint,borderColor:C.mintBorder}}><Text style={{color:C.greenDark,fontSize:12}}>Not connected to customer service. Your message is displayed locally only.</Text></KCard>
    {messages.map(msg=><View key={msg.id} style={[s.bubble,msg.outgoing&&s.outgoing]}><Text style={{color:msg.outgoing?C.white:C.text,lineHeight:20}}>{msg.text}</Text></View>)}
    <View style={s.composer}><TextInput style={s.input} value={draft} onChangeText={setDraft} placeholder="Type a message" placeholderTextColor={C.faint} multiline/><Pressable onPress={send} style={s.send}><Text style={{color:C.white,fontWeight:'800'}}>Send</Text></Pressable></View>
  </KScreen>;
}
const s=StyleSheet.create({
  bubble:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:12,padding:15,marginBottom:13,marginRight:30,alignSelf:'flex-start'},
  outgoing:{backgroundColor:C.green,marginRight:0,marginLeft:30,alignSelf:'flex-end'},
  composer:{flexDirection:'row',gap:8,alignItems:'center',marginTop:20},
  input:{flex:1,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:11,minHeight:49,paddingHorizontal:13,paddingVertical:10,color:C.title},
  send:{borderRadius:10,backgroundColor:C.green,paddingHorizontal:17,paddingVertical:15}
});
