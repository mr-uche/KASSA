import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

function subscribe() { return () => {}; }
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const colorScheme = useRNColorScheme();
  return hasHydrated ? colorScheme : 'light';
}
