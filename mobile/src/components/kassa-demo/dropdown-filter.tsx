import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { C } from './theme';

/** A compact, anchored select control. Tap outside or press Back to dismiss. */
export function DropdownFilter({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange(next: string): void;
}) {
  const anchor = useRef<React.ComponentRef<typeof View>>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState({ x: 12, y: 80, width: 125, height: 38 });

  function expand() {
    anchor.current?.measureInWindow((x, y, width, height) => {
      if (!width || !height) return;
      setRect({ x, y, width, height });
      setOpen(true);
    });
  }

  const menuWidth = Math.min(Math.max(rect.width, 165), screenWidth - 24);
  const menuHeight = Math.min(options.length * 43 + 10, 275);
  const left = Math.max(12, Math.min(rect.x, screenWidth - menuWidth - 12));
  const below = rect.y + rect.height + 4;
  const top = below + menuHeight <= screenHeight - 12
    ? below
    : Math.max(15, rect.y - menuHeight - 4);

  return <View ref={anchor} collapsable={false} style={s.anchor}>
    <Pressable accessibilityRole="button"
      accessibilityLabel={label + ': ' + value}
      accessibilityState={{ expanded: open }}
      onPress={expand} style={[s.select, open && s.open]}>
      <Text numberOfLines={1} style={s.selected}>{value}</Text>
      <Text style={s.chevron}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent statusBarTranslucent animationType="fade"
      onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Close ' + label + ' dropdown'}
          onPress={() => setOpen(false)} style={StyleSheet.absoluteFill}/>
        <View style={[s.menu, { top, left, width: menuWidth, maxHeight: menuHeight }]}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always">
            {options.map(option => (
              <Pressable key={option} accessibilityRole="button"
                accessibilityState={{ selected: value === option }}
                onPress={() => { onChange(option); setOpen(false); }}
                style={[s.option, value === option && s.optionSelected]}>
                <Text style={[s.optionText, value === option && s.selectedText]}
                  numberOfLines={1}>{option}</Text>
                {option === value && <Text style={s.checkmark}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  overlay: { flex: 1 },
  anchor: { flex: 1, minWidth: 0 },
  select: { minHeight: 39, backgroundColor: C.white, borderWidth: 1,
    borderColor: C.border, borderRadius: 8, flexDirection: 'row',
    alignItems: 'center', gap: 3, paddingHorizontal: 8 },
  open: { borderColor: C.green },
  selected: { flex: 1, color: C.text, fontWeight: '600', fontSize: 11 },
  chevron: { color: C.muted, fontSize: 17, fontWeight: '700' },
  menu: { position: 'absolute', backgroundColor: C.white, borderColor: C.border,
    borderWidth: 1, borderRadius: 9, overflow: 'hidden', paddingVertical: 5, elevation: 12 },
  option: { minHeight: 43, paddingHorizontal: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  optionSelected: { backgroundColor: C.mint },
  optionText: { flex: 1, fontSize: 13, color: C.title },
  selectedText: { color: C.green, fontWeight: '800' },
  checkmark: { color: C.green, fontWeight: '800', fontSize: 13 },
});
