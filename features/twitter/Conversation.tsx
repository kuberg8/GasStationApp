import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Post, position, User, userName } from './api';
import { MessengerState, useConversation } from './useMessenger';
import { Avatar, Button, IconButton, Notice, styles } from './ui';
import { useTwitterTheme } from './theme';

type Props = {
  messenger: MessengerState;
  peer: User | null;
  userId: string;
  onBack: () => void;
  active: boolean;
  drafts: React.MutableRefObject<Record<string, string>>;
};
export function Conversation({ messenger, peer, userId, onBack, active, drafts }: Props) {
  const t = useTwitterTheme();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const peerId = peer?._id || '';
  const history = useConversation(messenger, peerId);
  const [value, setValue] = useState(drafts.current[peerId] || '');
  const [editing, setEditing] = useState<Post | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [visibleMessage, setVisibleMessage] = useState<Post | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const list = useRef<FlatList<Post>>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const readPosition = useRef('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sendTyping = messenger.sendTyping;
  const api = messenger.api;
  const refreshList = messenger.refresh;
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) =>
      setAppActive(state === 'active'),
    );
    return () => {
      mounted.current = false;
      subscription.remove();
      clearTimeout(typingTimer.current);
      sendTyping(peerId, false);
    };
  }, [peerId, sendTyping]);
  useEffect(() => {
    if (!active || !appActive) sendTyping(peerId, false);
  }, [active, appActive, peerId, sendTyping]);
  useEffect(() => {
    if (
      !visibleMessage ||
      !active ||
      !appActive ||
      position(visibleMessage) <= readPosition.current
    )
      return;
    let disposed = false;
    const timer = setTimeout(() => {
      void api
        .read(peerId, visibleMessage._id)
        .then(() => {
          if (!disposed) {
            readPosition.current = position(visibleMessage);
            void refreshList();
          }
        })
        .catch(() => {
          /* Retried on the next visible message, focus, or reconnect. */
        });
    }, 500);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [visibleMessage, active, appActive, peerId, api, refreshList, messenger.revision]);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
      const newest = viewableItems
        .filter((item) => item.isViewable)
        .map((item) => item.item)
        .sort((a, b) => position(b).localeCompare(position(a)))[0];
      if (newest) setVisibleMessage(newest);
    },
  ).current;
  const changeText = (text: string) => {
    setValue(text);
    if (!editing) {
      drafts.current[peerId] = text;
      sendTyping(peerId, !!text.trim());
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => sendTyping(peerId, false), 3000);
    }
  };
  const submit = async () => {
    if (!value.trim() || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError('');
    sendTyping(peerId, false);
    const submitted = value;
    try {
      const result = editing
        ? await api.edit(editing._id, submitted.trim())
        : await api.send(submitted.trim(), peerId);
      if (!mounted.current) return;
      history.apply(result.post);
      if (!editing) drafts.current[peerId] = '';
      setValue(drafts.current[peerId] || '');
      setEditing(null);
      if (!editing) list.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const deleteMessage = (post: Post) =>
    Alert.alert('Удалить сообщение?', 'Восстановить его не получится.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.remove(post._id);
            if (mounted.current) {
              history.apply(post, true);
              if (editing?._id === post._id) {
                setEditing(null);
                setValue(drafts.current[peerId] || '');
              }
            }
          } catch (e) {
            if (mounted.current) setError((e as Error).message);
          }
        },
      },
    ]);
  const actions = (post: Post) => {
    if (saving || post.user._id !== userId) return;
    Alert.alert('Сообщение', undefined, [
      {
        text: 'Редактировать',
        onPress: () => {
          setEditing(post);
          setValue(post.message);
        },
      },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteMessage(post),
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };
  const deleteChat = () =>
    Alert.alert(
      'Удалить переписку?',
      'Выберите, у кого удалить сообщения. Восстановить их не получится.',
      [
        { text: 'Отмена', style: 'cancel' },
        ...(['self', 'both'] as const).map((scope) => ({
          text: scope === 'self' ? 'Только у меня' : 'У обоих',
          style: 'destructive' as const,
          onPress: async () => {
            try {
              await api.removeChat(peerId, scope);
              if (mounted.current) {
                void messenger.refresh();
                onBack();
              }
            } catch (e) {
              if (mounted.current) setError((e as Error).message);
            }
          },
        })),
      ],
    );
  const renderMessage = ({ item, index }: { item: Post; index: number }) => {
    const own = item.user._id === userId;
    const read = !!history.receipt && position(item) <= history.receipt;
    const date = new Date(item.created_at);
    // The list is inverted: the next item is the preceding message in time.
    const older = history.page?.posts[index + 1];
    const showDate =
      !older || new Date(older.created_at).toDateString() !== date.toDateString();
    return (
      <View style={{ paddingHorizontal: 12, paddingVertical: 3 }}>
        {showDate && (
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
            <Text
              style={{
                color: t.icon,
                backgroundColor: t.surface,
                fontSize: 11,
                paddingHorizontal: 13,
                paddingVertical: 5,
                borderRadius: 14,
              }}
            >
              {date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: own ? 'flex-end' : 'flex-start',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {own && (
            <IconButton
              name="more-horiz"
              label="Действия с сообщением"
              onPress={() => actions(item)}
              disabled={saving}
            />
          )}
          <Pressable
            accessibilityLabel={`${own ? 'Вы' : userName(item.user)}: ${item.message}`}
            onLongPress={() => actions(item)}
            style={{
              maxWidth: own ? '82%' : '90%',
              borderRadius: 16,
              borderBottomRightRadius: own ? 4 : 16,
              borderBottomLeftRadius: own ? 16 : 4,
              paddingHorizontal: 12,
              paddingVertical: 7,
              backgroundColor: own ? t.outgoing : t.surface,
            }}
          >
            {!own && !peerId && (
              <Text
                style={{
                  color: t.tint,
                  fontWeight: '600',
                  fontSize: 12,
                  marginBottom: 3,
                }}
              >
                {userName(item.user)}
              </Text>
            )}
            <Text selectable style={{ color: t.text, fontSize: 16, lineHeight: 22 }}>
              {item.message}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
                marginTop: 2,
              }}
            >
              <Text style={{ color: t.icon, fontSize: 10 }}>
                {date.toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {own && !!peerId && (
                <MaterialIcons
                  name={read ? 'done-all' : 'done'}
                  size={16}
                  accessibilityLabel={read ? 'Прочитано' : 'Отправлено'}
                  color={read ? t.tint : t.icon}
                />
              )}
            </View>
          </Pressable>
        </View>
      </View>
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <View style={[styles.header, { borderColor: t.border, paddingHorizontal: 6 }]}>
        <IconButton name="arrow-back" label="Назад к чатам" onPress={onBack} />
        <Avatar
          name={userName(peer)}
          general={!peer}
          online={!!peer && messenger.presence.includes(peerId)}
        />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: t.text, fontWeight: '600', fontSize: 17 }}>
            {peer ? userName(peer) : 'Общий чат'}
          </Text>
          <Text style={[styles.subtitle, { color: t.icon }]}>
            {messenger.typingPeers.includes(peerId)
              ? 'Печатает…'
              : !messenger.connected
                ? 'Переподключение…'
                : !peer
                  ? 'Обсуждаем всё вместе'
                  : messenger.presence.includes(peerId)
                    ? 'В сети'
                    : 'Не в сети'}
          </Text>
        </View>
        {peer && (
          <IconButton
            name="delete-outline"
            label="Удалить переписку"
            onPress={deleteChat}
            disabled={saving}
          />
        )}
      </View>
      <Notice text={history.error} retry={() => void history.refresh()} />
      {history.loading && !history.page ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={t.tint} />
        </View>
      ) : (
        <FlatList
          ref={list}
          inverted
          data={history.page?.posts || []}
          keyExtractor={(post) => post._id}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Avatar name="О" general />
              <Text style={{ color: t.text, fontSize: 20, fontWeight: '600' }}>
                Всё начинается с «привет»
              </Text>
              <Text style={{ color: t.icon, textAlign: 'center' }}>
                Напишите первое сообщение.
              </Text>
            </View>
          }
          ListFooterComponent={
            history.page?.nextCursor ? (
              <View style={{ padding: 12 }}>
                <Button
                  secondary
                  busy={history.olderLoading}
                  onPress={() => void history.loadOlder()}
                >
                  Предыдущие сообщения
                </Button>
              </View>
            ) : null
          }
        />
      )}
      <Notice text={error} />
      <View
        testID="message-composer"
        style={{
          borderTopWidth: 1,
          borderColor: t.border,
          padding: 12,
          paddingBottom: keyboardVisible ? 0 : insets.bottom,
          gap: 8,
        }}
      >
        {editing && (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.tint, fontWeight: '600' }}>Редактирование</Text>
              <Text numberOfLines={1} style={{ color: t.icon }}>
                {editing.message}
              </Text>
            </View>
            <IconButton
              name="close"
              label="Отменить редактирование"
              disabled={saving}
              onPress={() => {
                setEditing(null);
                setValue(drafts.current[peerId] || '');
              }}
            />
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            accessibilityLabel="Сообщение"
            placeholder="Напишите сообщение…"
            placeholderTextColor={t.icon}
            multiline
            maxLength={5000}
            value={value}
            onChangeText={changeText}
            editable={!saving}
            onBlur={() => sendTyping(peerId, false)}
            style={{
              flex: 1,
              minHeight: 46,
              maxHeight: 130,
              backgroundColor: t.surface,
              borderRadius: 14,
              color: t.text,
              fontSize: 16,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
            }}
          />
          {saving ? (
            <ActivityIndicator color={t.tint} style={{ width: 44, height: 46 }} />
          ) : (
            <IconButton
              name="send"
              label={editing ? 'Сохранить сообщение' : 'Отправить сообщение'}
              disabled={!value.trim() || !history.page}
              onPress={() => void submit()}
            />
          )}
        </View>
        {!!value.length && (
          <Text style={{ color: t.icon, fontSize: 11, textAlign: 'right' }}>
            {value.length} / 5000
          </Text>
        )}
      </View>
    </View>
  );
}
