import React,{useState} from 'react';
import { Alert,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { products } from '@/components/kassa-demo/data';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C,naira } from '@/components/kassa-demo/theme';
import { KScreen,KCard,KField,KButton } from '@/components/kassa-demo/ui';
export default function ScanProduct(){
  const router=useRouter();const store=useKassaDemo();const [code,setCode]=useState('');
  const match=products.find(item=>item.id.toLowerCase()===code.trim().toLowerCase());
  return <KScreen title="Scan Product" subtitle="Manual SKU search in this preview." back>
    <View style={s.scanner}><View style={s.cornerTL}/><View style={s.cornerTR}/><Text style={s.scannerText}>▣</Text><Text style={{color:C.muted,fontSize:12}}>Camera scanning is not connected</Text><View style={s.cornerBL}/><View style={s.cornerBR}/></View>
    <KField label="Enter code manually" placeholder="Try WATER-001 or JUICE-001" value={code} onChangeText={setCode}/>
    {match ? <KCard><Text style={{fontWeight:'800',color:C.title}}>{match.name}</Text><Text style={{color:C.muted,marginVertical:7}}>{naira(match.price)} · {match.stock} in stock</Text><KButton text="Add to current sale" onPress={()=>{store.add(match.id);Alert.alert('Item added',`${match.name} added to current sale.`)}}/><KButton text="View sale" variant="outline" onPress={()=>router.push('/cashier/new-sale')}/></KCard> : <Text style={{color:C.muted,fontSize:12}}>Enter the exact sample product SKU to show a result.</Text>}
  </KScreen>;
}
const s=StyleSheet.create({
  scanner:{height:300,backgroundColor:'#EFF7F4',borderRadius:14,alignItems:'center',justifyContent:'center',marginBottom:25,position:'relative'},
  scannerText:{fontSize:75,color:C.green,marginBottom:8},
  cornerTL:{position:'absolute',left:20,top:20,width:37,height:37,borderLeftWidth:5,borderTopWidth:5,borderColor:C.green},
  cornerTR:{position:'absolute',right:20,top:20,width:37,height:37,borderRightWidth:5,borderTopWidth:5,borderColor:C.green},
  cornerBL:{position:'absolute',left:20,bottom:20,width:37,height:37,borderLeftWidth:5,borderBottomWidth:5,borderColor:C.green},
  cornerBR:{position:'absolute',right:20,bottom:20,width:37,height:37,borderRightWidth:5,borderBottomWidth:5,borderColor:C.green},
});
