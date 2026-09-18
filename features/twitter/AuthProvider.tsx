import {
  createContext,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { Endpoints, Session } from './api';
import { loadEndpoints, loadSession, saveEndpoints, saveSession } from './storage';
import { ServerSettings } from './ServerSettings';

type AuthState = {
  endpoints: Endpoints | null;
  session: Session | null;
  ready: boolean;
  error: string;
  bootError: string;
  settings: boolean;
  retry: () => void;
  login: (session: Session) => Promise<void>;
  logout: () => void;
  expired: () => void;
  openSettings: () => void;
};
const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [endpoints, setEndpoints] = useState<Endpoints | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState('');
  const [bootError, setBootError] = useState('');
  const [retry, setRetry] = useState(0);
  const latestSession = useRef(session);
  latestSession.current = session;
  useEffect(() => {
    let disposed = false;
    setBootError('');
    setReady(false);
    (async () => {
      try {
        const server = await loadEndpoints();
        const saved = await loadSession(server);
        if (!disposed) {
          setEndpoints(server);
          setSession(saved);
        }
      } catch (e) {
        if (!disposed) setBootError(`Не удалось загрузить настройки: ${(e as Error).message}`);
      } finally {
        if (!disposed) setReady(true);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [retry]);
  const expired = useCallback(() => {
    if (!session || latestSession.current?.token !== session.token) return;
    setSession(null);
    setError('Сессия истекла. Войдите ещё раз.');
    if (endpoints) void saveSession(null, endpoints).catch(() => {});
  }, [endpoints, session]);
  const login = async (value: Session) => {
    if (!endpoints) return;
    await saveSession(value, endpoints);
    setError('');
    setSession(value);
  };
  const logout = () =>
    Alert.alert('Выйти из приложения?', 'Войти снова можно с тем же аккаунтом.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        onPress: async () => {
          try {
            if (endpoints) await saveSession(null, endpoints);
            setSession(null);
            setError('');
          } catch {
            Alert.alert('Ошибка', 'Не удалось удалить сохранённый вход. Попробуйте ещё раз.');
          }
        },
      },
    ]);
  const changeServer = async (value: Endpoints) => {
    if (value.api === endpoints?.api && value.socket === endpoints.socket) return;
    if (endpoints) await saveSession(null, endpoints);
    setSession(null);
    await saveEndpoints(value);
    setEndpoints(value);
    setError('');
  };
  return (
    <AuthContext.Provider
      value={{
        endpoints,
        session,
        ready,
        error,
        bootError,
        settings,
        retry: () => setRetry((value) => value + 1),
        login,
        logout,
        expired,
        openSettings: () => setSettings(true),
      }}
    >
      {children}
      {settings && endpoints && (
        <ServerSettings
          endpoints={endpoints}
          onSave={changeServer}
          onClose={() => setSettings(false)}
        />
      )}
    </AuthContext.Provider>
  );
}
