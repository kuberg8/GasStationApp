import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { User, userName } from './api';
import { MessengerState } from './useMessenger';
import { Avatar, Button, Field, IconButton, Notice, styles } from './ui';
import { useTwitterTheme } from './theme';
export function ChatList({
  messenger,
  onSelect,
  onSettings,
  onLogout,
}: {
  messenger: MessengerState;
  onSelect: (user: User | null) => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const t = useTwitterTheme();
  const [query, setQuery] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!choosing) return;
    let disposed = false;
    setSearching(true);
    setSearchError('');
    const timer = setTimeout(async () => {
      try {
        const result = await messenger.api.users(query.trim());
        if (!disposed) setUsers(result);
      } catch (e) {
        if (!disposed) setSearchError((e as Error).message);
      } finally {
        if (!disposed) setSearching(false);
      }
    }, 250);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [choosing, query, messenger.api, retry]);
  const choose = (user: User | null) => {
    onSelect(user);
    setChoosing(false);
    setQuery('');
  };
  const items = choosing
    ? users.map((peer) => ({ peer, message: 'Начать разговор', created_at: 0 }))
    : messenger.chats.filter((chat) =>
        userName(chat.peer).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      );
  const badge = (count: number) =>
    count > 0 ? (
      <View
        accessibilityLabel={`Непрочитанных: ${count}`}
        style={{
          backgroundColor: t.tint,
          borderRadius: 12,
          minWidth: 23,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}
      >
        <Text style={{ color: t.buttonText, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    ) : null;
  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <View style={[styles.header, { borderColor: t.border }]}>
        <Avatar name="T" general />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]}>twitter.</Text>
          <Text style={[styles.subtitle, { color: t.icon }]}>Сообщения</Text>
        </View>
        <IconButton name="settings" label="Настройки подключения" onPress={onSettings} />
      </View>
      <View style={{ padding: 16 }}>
        <Field
          placeholder={choosing ? 'Имя собеседника' : 'Поиск чатов'}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>
      {!choosing && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Общий чат"
          onPress={() => choose(null)}
          style={({ pressed }) => [
            styles.row,
            {
              marginHorizontal: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: t.surface,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <Avatar name="О" general />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>Общий чат</Text>
            <Text style={[styles.subtitle, { color: t.icon }]}>
              {messenger.typingPeers.includes('') ? 'Кто-то печатает…' : 'Обсуждаем всё вместе'}
            </Text>
          </View>
          {badge(messenger.unread.general)}
        </Pressable>
      )}
      <View style={[styles.row, { paddingLeft: 24, paddingRight: 12, marginTop: 10 }]}>
        <Text style={{ color: t.icon, fontWeight: '600', flex: 1 }}>
          {choosing ? 'Новый разговор' : 'Личные сообщения'}
        </Text>
        <IconButton
          name={choosing ? 'close' : 'add'}
          label={choosing ? 'Закрыть поиск участников' : 'Новый чат'}
          onPress={() => {
            setChoosing((value) => !value);
            setQuery('');
          }}
        />
      </View>
      <Notice
        text={choosing ? searchError : messenger.error}
        retry={() => (choosing ? setRetry((value) => value + 1) : void messenger.refresh())}
      />
      {(choosing ? searching : messenger.loading) && (
        <ActivityIndicator color={t.tint} style={{ padding: 16 }} />
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.peer._id}
        keyboardShouldPersistTaps="handled"
        refreshing={!choosing && messenger.loading}
        onRefresh={() => void messenger.refresh()}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(item.peer)}
            style={({ pressed }) => [
              styles.row,
              {
                padding: 12,
                borderRadius: 14,
                backgroundColor: pressed ? t.surface : 'transparent',
              },
            ]}
          >
            <Avatar
              name={userName(item.peer)}
              online={messenger.presence.includes(item.peer._id)}
            />
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, color: t.text, fontWeight: '600', fontSize: 15 }}
                >
                  {userName(item.peer)}
                </Text>
                {!!item.created_at && (
                  <Text style={{ color: t.icon, fontSize: 11 }}>
                    {new Date(item.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                )}
              </View>
              <Text numberOfLines={1} style={{ color: t.icon, fontSize: 13 }}>
                {messenger.typingPeers.includes(item.peer._id) ? 'Печатает…' : item.message}
              </Text>
            </View>
            {badge(messenger.unread[item.peer._id])}
          </Pressable>
        )}
        ListEmptyComponent={
          !(choosing ? searching : messenger.loading) &&
          !(choosing ? searchError : messenger.error) ? (
            <View style={styles.empty}>
              <Text style={{ color: t.icon, textAlign: 'center', lineHeight: 22 }}>
                {choosing
                  ? 'Участники не найдены.'
                  : query
                    ? 'Таких диалогов пока нет.'
                    : 'Ваши разговоры будут здесь.'}
              </Text>
              {!choosing && (
                <Button
                  secondary
                  onPress={() => {
                    setChoosing(true);
                    setQuery('');
                  }}
                >
                  Начать переписку
                </Button>
              )}
            </View>
          ) : null
        }
      />
      <View
        style={[
          styles.row,
          { borderTopWidth: 1, borderColor: t.border, paddingHorizontal: 20, paddingVertical: 4 },
        ]}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: messenger.connected ? t.tint : t.icon,
          }}
        />
        <Text style={{ color: t.icon, fontSize: 12, flex: 1 }}>
          {messenger.connected ? 'Подключено' : 'Подключаемся…'}
        </Text>
        <IconButton name="logout" label="Выйти из аккаунта" onPress={onLogout} />
      </View>
    </View>
  );
}
