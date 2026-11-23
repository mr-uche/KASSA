import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C, naira } from './theme';
import { categoryColors } from './expenses-data';

export type CategoryAmount = readonly [string, number];

const SIZE = 224;
const CENTER = SIZE / 2;
const RADIUS = 78;
const WIDTH = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Actual SVG doughnut chart using the app's existing expo-image dependency.
 * Renders locally without internet access or another native module / APK rebuild.
 * The same category data is exposed as a readable legend for accessibility.
 */
// SVG markup is generated from fixed ASCII tags, hex colours, and numbers.
// Base64 works with Android Glide data-URI loaders; percent-encoded SVG URIs
// are not consistently supported by native image loaders.
function base64Ascii(value: string): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < value.length; i += 3) {
    const first = value.charCodeAt(i);
    const second = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
    const third = i + 2 < value.length ? value.charCodeAt(i + 2) : 0;
    const combined = (first << 16) | (second << 8) | third;
    result += letters[(combined >>> 18) & 63] + letters[(combined >>> 12) & 63] +
      (i + 1 < value.length ? letters[(combined >>> 6) & 63] : '=') +
      (i + 2 < value.length ? letters[combined & 63] : '=');
  }
  return result;
}

function chartDataUri(entries: CategoryAmount[]): string {
  const total = entries.reduce((sum, [, amount]) =>
    sum + (Number.isFinite(amount) && amount > 0 ? amount : 0), 0);

  let offset = 0;
  const arcs = entries.map(([, amount], index) => {
    const length = total > 0 ? CIRCUMFERENCE * amount / total : 0;
    const gap = entries.length > 1 ? Math.min(2.5, length * 0.15) : 0;
    const visible = Math.max(0, length - gap);
    const element = visible > 0
      ? '<circle cx="' + CENTER + '" cy="' + CENTER + '" r="' + RADIUS +
        '" fill="none" stroke="' + categoryColors[index % categoryColors.length] +
        '" stroke-width="' + WIDTH + '" stroke-dasharray="' + visible.toFixed(4) +
        ' ' + (CIRCUMFERENCE - visible).toFixed(4) + '" stroke-dashoffset="' +
        (-offset).toFixed(4) + '" transform="rotate(-90 ' + CENTER + ' ' + CENTER + ')"/>'
      : '';
    offset += length;
    return element;
  }).join('');

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + SIZE +
    '" height="' + SIZE + '" viewBox="0 0 ' + SIZE + ' ' + SIZE + '">' +
    '<circle cx="' + CENTER + '" cy="' + CENTER + '" r="' + RADIUS +
    '" fill="none" stroke="#EAF4EF" stroke-width="' + WIDTH + '"/>' +
    arcs + '</svg>';
  return 'data:image/svg+xml;base64,' + base64Ascii(svg);
}

export function ExpenseDonut({ entries }: { entries: CategoryAmount[] }) {
  const filtered = useMemo(() => entries.filter(([, amount]) =>
    Number.isFinite(amount) && amount > 0), [entries]);
  const total = filtered.reduce((sum, [, amount]) => sum + amount, 0);
  const uri = useMemo(() => chartDataUri(filtered), [filtered]);

  return <View style={s.wrapper}>
    <View style={s.chart}>
      <Image
        accessibilityLabel="Doughnut chart of business expenses by category"
        source={{ uri }}
        cachePolicy="memory"
        contentFit="contain"
        style={s.image}
      />
      <View pointerEvents="none" style={s.centerText}>
        <Text style={s.centerCaption}>{total > 0 ? 'Total expenses' : 'No expenses yet'}</Text>
        <Text style={s.centerAmount} numberOfLines={2} adjustsFontSizeToFit
          minimumFontScale={0.65}>{naira(total)}</Text>
      </View>
    </View>
    {filtered.map(([name, amount], index) =>
      <View key={name} style={s.legendRow}>
        <View style={[s.legendDot,
          { backgroundColor: categoryColors[index % categoryColors.length] }]}/>
        <Text numberOfLines={1} style={s.categoryName}>{name}</Text>
        <Text style={s.categoryAmount}>{naira(amount)}</Text>
        <Text style={s.percentage}>{(amount / total * 100).toFixed(1)}%</Text>
      </View>)}
    {!filtered.length &&
      <Text style={s.emptyHint}>Add an expense to see your spending by category.</Text>}
  </View>;
}

const s = StyleSheet.create({
  wrapper: { alignItems: 'stretch' },
  chart: { height: SIZE, width: SIZE, alignSelf: 'center', marginVertical: 12 },
  image: { width: SIZE, height: SIZE },
  centerText: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 55 },
  centerCaption: { fontSize: 12, color: C.muted, textAlign: 'center' },
  centerAmount: { fontSize: 19, fontWeight: '800', color: C.title,
    textAlign: 'center', marginTop: 5 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopColor: C.border, borderTopWidth: 1, paddingVertical: 10 },
  legendDot: { width: 11, height: 11, borderRadius: 6 },
  categoryName: { flex: 1, minWidth: 0, fontSize: 13, color: C.text },
  categoryAmount: { fontSize: 13, fontWeight: '700', color: C.title },
  percentage: { width: 46, textAlign: 'right', fontSize: 12, color: C.muted },
  emptyHint: { textAlign: 'center', fontSize: 13, color: C.muted, marginBottom: 9 },
});
