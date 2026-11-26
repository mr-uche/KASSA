import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Refresh display-only expiry checks while foregrounded; writes still validate current time. */
export function useCurrentTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return now;
}
