import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C, naira } from './theme';
import { expenseCategoryColor } from './expenses-data';

export type CategoryAmount = readonly [string, number];

const SIZE = 224;
const DISPLAY_SIZE = 110;
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
  const arcs = entries.map(([name, amount]) => {
    const length = total > 0 ? CIRCUMFERENCE * amount / total : 0;
    const gap = entries.length > 1 ? Math.min(2.5, length * 0.15) : 0;
    const visible = Math.max(0, length - gap);
    const element = visible > 0
      ? '<circle cx="' + CENTER + '" cy="' + CENTER + '" r="' + RADIUS +
        '" fill="none" stroke="' + expenseCategoryColor(name) +
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
    </View>
    <View style={s.legend}>
      {filtered.map(([name, amount]) =>
        <View key={name} style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: expenseCategoryColor(name) }]}/>
          <Text numberOfLines={2} style={s.categoryName}>{name}</Text>
          <View style={s.legendValues}>
            <Text style={s.categoryAmount} numberOfLines={1} adjustsFontSizeToFit
              minimumFontScale={0.75}>{naira(amount)}</Text>
            <Text style={s.percentage}>{Math.round(amount / total * 100)}%</Text>
          </View>
        </View>)}
      {!filtered.length &&
        <Text style={s.emptyHint}>Add an expense to see your spending by category.</Text>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  chart: { height: DISPLAY_SIZE, width: DISPLAY_SIZE, flexShrink: 0 },
  image: { width: DISPLAY_SIZE, height: DISPLAY_SIZE },
  legend: { flex: 1, minWidth: 0, gap: 7 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  legendDot: { width: 8, height: 8, borderRadius: 2, flexShrink: 0 },
  categoryName: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 14, color: C.text },
  legendValues: { alignItems: 'flex-end', maxWidth: '48%', minWidth: 0 },
  categoryAmount: { fontSize: 11, fontWeight: '700', color: C.title, textAlign: 'right' },
  percentage: { fontSize: 10, color: C.muted, marginTop: 1 },
  emptyHint: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 17 },
});
