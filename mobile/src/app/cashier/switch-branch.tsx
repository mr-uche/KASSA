import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/components/kassa-demo/theme';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { KScreen, KCard, KButton } from '@/components/kassa-demo/ui';
const branches=['Main Branch','Lekki Branch','Ikeja Branch'];
export default function SwitchBranch(){
  const router=useRouter();const store=useKassaDemo();
  return <KScreen title="Switch branch" subtitle="Choose which sample branch to preview." back nav={false}>
    <KCard>{branches.map(branch=><Pressable key={branch} onPress={()=>store.setBranch(branch)} style={{flexDirection:'row',alignItems:'center',paddingVertical:18,borderBottomWidth:1,borderColor:C.border}}>
      <View style={{height:20,width:20,borderRadius:10,borderWidth:2,borderColor:C.green,alignItems:'center',justifyContent:'center',marginRight:14}}>{branch===store.branch&&<View style={{height:10,width:10,borderRadius:5,backgroundColor:C.green}}/>}</View>
      <Text style={{color:C.title,fontWeight:'700',flex:1}}>{branch}</Text>
      {branch===store.branch&&<Text style={{color:C.green}}>Selected</Text>}
    </Pressable>)}</KCard>
    <KButton text="Use this branch" onPress={()=>router.replace('/cashier')}/>
    <Text style={{color:C.muted,fontSize:12,marginTop:18}}>These are sample branches. No backend settings are changed.</Text>
  </KScreen>;
}
