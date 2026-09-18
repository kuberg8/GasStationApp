import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Endpoints, normalizeEndpoints, Session } from './api';
const SESSION = 'gasstation.twitter.session.v1';
const SERVER = 'gasstation.twitter.server.v1';
export function defaultEndpoints(): Endpoints {
  // Expo's LAN address refers to the computer, unlike localhost on a physical phone.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  const fallback =
    host && !['localhost', '127.0.0.1', '0.0.0.0'].includes(host) && !host.endsWith('.exp.direct')
      ? host
      : Platform.OS === 'android'
        ? '10.0.2.2'
        : 'localhost';
  return normalizeEndpoints(
    process.env.EXPO_PUBLIC_TWITTER_API_URL || `http://${fallback}:3000`,
    process.env.EXPO_PUBLIC_TWITTER_WEBSOCKET_URL,
  );
}
export async function loadEndpoints() {
  const saved = await AsyncStorage.getItem(SERVER);
  if (saved) {
    try {
      const value = JSON.parse(saved);
      return normalizeEndpoints(value.api, value.socket);
    } catch {
      /* Use environment defaults for invalid saved settings. */
    }
  }
  return defaultEndpoints();
}
export const saveEndpoints = (value: Endpoints) =>
  AsyncStorage.setItem(SERVER, JSON.stringify(value));
export async function loadSession(endpoints: Endpoints): Promise<Session | null> {
  const raw =
    Platform.OS === 'web'
      ? sessionStorage.getItem(SESSION)
      : await SecureStore.getItemAsync(SESSION);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    return saved.api === endpoints.api &&
      typeof saved.session?.token === 'string' &&
      typeof saved.session?.user_id === 'string'
      ? saved.session
      : null;
  } catch {
    return null;
  }
}
export async function saveSession(session: Session | null, endpoints: Endpoints) {
  const value = session ? JSON.stringify({ api: endpoints.api, session }) : null;
  if (Platform.OS === 'web') {
    if (value) sessionStorage.setItem(SESSION, value);
    else sessionStorage.removeItem(SESSION);
  } else if (value) await SecureStore.setItemAsync(SESSION, value);
  else await SecureStore.deleteItemAsync(SESSION);
}
