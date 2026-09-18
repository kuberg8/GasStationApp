import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Endpoints, normalizeEndpoints } from './api';
import { useTwitterTheme } from './theme';
import { Button, Field, IconButton, Notice, styles } from './ui';
export function ServerSettings({
  endpoints,
  onSave,
  onClose,
}: {
  endpoints: Endpoints;
  onSave: (value: Endpoints) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTwitterTheme();
  const [api, setApi] = useState(endpoints.api);
  const [socket, setSocket] = useState(endpoints.socket);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setError('');
    setBusy(true);
    try {
      await onSave(normalizeEndpoints(api, socket));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      presentationStyle="fullScreen"
      animationType="slide"
      onRequestClose={() => !busy && onClose()}
    >
      <SafeAreaProvider>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView
            edges={['top', 'bottom', 'left', 'right']}
            style={{ flex: 1, backgroundColor: t.background }}
          >
            <View style={[styles.header, { borderColor: t.border }]}>
              <Text style={{ color: t.text, fontSize: 22, fontWeight: '700', flex: 1 }}>
                Подключение
              </Text>
              <IconButton
                name="close"
                label="Закрыть настройки"
                onPress={onClose}
                disabled={busy}
              />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentInsetAdjustmentBehavior="never"
              contentContainerStyle={{ padding: 24, gap: 20 }}
            >
              <Text style={{ color: t.icon, lineHeight: 22 }}>
                Укажите тот же сервер, к которому подключён ваш Twitter. На телефоне для локального
                сервера нужен IP компьютера в Wi-Fi, а не localhost.
              </Text>
              <Field
                label="Адрес API"
                placeholder="https://your-server.example"
                value={api}
                onChangeText={(value) => {
                  setApi(value);
                  setSocket(value.replace(/^http/, 'ws'));
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!busy}
              />
              <Field
                label="Адрес WebSocket"
                placeholder="wss://your-server.example"
                value={socket}
                onChangeText={setSocket}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!busy}
              />
              <Notice text={error} />
              <Button busy={busy} onPress={save}>
                Сохранить
              </Button>
              <Text style={{ color: t.icon, fontSize: 13, lineHeight: 20 }}>
                При смене сервера нужно войти заново. Цвета следуют теме GasStationApp.
              </Text>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </Modal>
  );
}
