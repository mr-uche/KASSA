import React,{useState} from 'react';
import { Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/components/kassa-demo/theme';
import { KScreen,KCard,KButton,KLinkRow,SectionTitle } from '@/components/kassa-demo/ui';
const faq=[
  ['How do I create a sale?','Open New sale, select products, then review the amount before choosing a payment method.'],
  ['How do I find a product?','Use the search box on Products or New sale. The scanner demo also supports manual SKU lookup.'],
  ['Where can I see my transactions?','Open the Sales tab to see sample transactions and filter by status.'],
  ['Can I switch branches?','Open Profile, then Switch branch. In this preview, the selection is stored in memory only.'],
];
export default function Help(){const router=useRouter();const [expanded,setExpanded]=useState(-1);
  return <KScreen title="Help & Support" subtitle="Common questions and ways to get assistance." back>
    <SectionTitle>Frequently asked questions</SectionTitle>
    <KCard>{faq.map(([question,answer],i)=><View key={question}>
      <KLinkRow title={question} onPress={()=>setExpanded(expanded===i?-1:i)} symbol={expanded===i?'⌄':'›'}/>
      {expanded===i&&<Text style={{color:C.muted,fontSize:12,lineHeight:19,paddingBottom:17}}>{answer}</Text>}
    </View>)}</KCard>
    <SectionTitle>Contact support</SectionTitle>
    <KCard><Text style={{color:C.text,fontSize:12,lineHeight:18}}>Start a sample chat conversation. This is a local preview and does not contact a support agent.</Text><View style={{marginTop:14}}><KButton text="Open chat preview" onPress={()=>router.push('/cashier/chat')}/></View></KCard>
  </KScreen>;
}
