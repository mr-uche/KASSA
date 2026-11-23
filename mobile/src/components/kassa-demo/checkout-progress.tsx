import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from './theme';

type Stage = 1 | 2 | 3;

/** Display only: checkout transitions are controlled by the existing sales flow. */
export function CheckoutProgress({ stage }: { stage: Stage }) {
  return <View accessibilityLabel={'Checkout stage ' + stage + ' of 3'} style={s.container}>
    {(['Sale', 'Payment', 'Receipt'] as const).map((label, index) => {
      const number = (index + 1) as Stage;
      const done = stage > number;
      const current = stage === number;
      return <React.Fragment key={label}>
        <View style={s.step}>
          <View style={[s.dot, (done || current) && s.activeDot]}>
            <Text style={[s.number, (done || current) && s.activeNumber]}>
              {done ? '✓' : number}
            </Text>
          </View>
          <Text style={[s.caption, (done || current) && s.activeCaption]}>{label}</Text>
        </View>
        {number < 3 && <View style={[s.line, done && s.activeLine]} />}
      </React.Fragment>;
    })}
  </View>;
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, paddingHorizontal: 8 },
  step: { width: 66, alignItems: 'center' },
  dot: { width: 29, height: 29, borderRadius: 15, alignItems: 'center',
    justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  activeDot: { backgroundColor: C.green, borderColor: C.green },
  number: { color: C.faint, fontSize: 13, fontWeight: '800' },
  activeNumber: { color: C.white },
  caption: { marginTop: 6, fontSize: 12, fontWeight: '700', color: C.muted },
  activeCaption: { color: C.green },
  line: { flex: 1, marginTop: 14, height: 2, backgroundColor: C.border },
  activeLine: { backgroundColor: C.green },
});
