import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { Endpoints, Session, User } from './api';
import { ChatList } from './ChatList';
import { Conversation } from './Conversation';
import { useMessenger } from './useMessenger';
import { useTwitterTheme } from './theme';
import { Avatar, styles } from './ui';
import { useAuth } from './AuthProvider';

export default function TwitterScreen() {
  const t = useTwitterTheme();
  const focused = useIsFocused();
  const { endpoints, session, settings, expired, openSettings, logout } = useAuth();
  if (!endpoints || !session) return null;
  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Messenger
          key={`${endpoints.api}:${session.user_id}`}
          endpoints={endpoints}
          session={session}
          active={focused && !settings}
          onExpired={expired}
          onSettings={openSettings}
          onLogout={logout}
        />
      </SafeAreaView>
    </View>
  );
}
function Messenger({
  endpoints,
  session,
  active,
  onExpired,
  onSettings,
  onLogout,
}: {
  endpoints: Endpoints;
  session: Session;
  active: boolean;
  onExpired: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const t = useTwitterTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [peer, setPeer] = useState<User | null | undefined>(undefined);
  const navigation = useNavigation();
  const chatOpen = peer !== undefined;
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: chatOpen ? { display: 'none' } : undefined });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [navigation, chatOpen]);
  const drafts = useRef<Record<string, string>>({});
  const messenger = useMessenger(endpoints, session, active, onExpired);
  useEffect(() => {
    if (!active || peer === undefined) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setPeer(undefined);
      return true;
    });
    return () => listener.remove();
  }, [active, peer]);
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {(wide || peer === undefined) && (
        <View
          style={wide ? { width: 320, borderRightWidth: 1, borderColor: t.border } : { flex: 1 }}
        >
          <ChatList
            messenger={messenger}
            onSelect={setPeer}
            onSettings={onSettings}
            onLogout={onLogout}
          />
        </View>
      )}
      {peer !== undefined ? (
        <Conversation
          key={peer?._id || 'general'}
          messenger={messenger}
          peer={peer}
          userId={session.user_id}
          active={active}
          onBack={() => setPeer(undefined)}
          drafts={drafts}
        />
      ) : (
        wide && (
          <View style={[styles.empty, { flex: 1 }]}>
            <Avatar name="T" general />
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '600' }}>Живые разговоры.</Text>
            <Text style={{ color: t.icon }}>Выберите чат, чтобы начать общение.</Text>
          </View>
        )
      )}
    </View>
  );
}
