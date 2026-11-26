import { useNetworkState } from 'expo-network';

/**
 * Connectivity is a hint; it is not proof the KASSA API is reachable.
 * Cached catalogue fallback in the store also handles server outages.
 * An undefined initial network state is not treated as offline.
 */
export function useKassaConnectivity() {
  const state = useNetworkState();
  const disconnected = state.isConnected === false || state.isInternetReachable === false;
  return { disconnected, connected: !disconnected && state.isConnected === true };
}
