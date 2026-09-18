import { useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { createTwitterApi, Endpoints, Session } from './api';
import { Avatar, Button, Field, IconButton, Notice, styles } from './ui';
import { useTwitterTheme } from './theme';
export function AuthScreen({
  endpoints,
  onLogin,
  onSettings,
  message,
}: {
  endpoints: Endpoints;
  onLogin: (session: Session) => Promise<void>;
  onSettings: () => void;
  message: string;
}) {
  const t = useTwitterTheme();
  const api = useMemo(() => createTwitterApi(endpoints), [endpoints]);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const submit = async () => {
    if (pending.current) return;
    setError('');
    setInfo('');
    if (!email.trim() || !password || (registering && (!firstName.trim() || !lastName.trim()))) {
      setError('Заполните все поля.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Проверьте адрес электронной почты.');
      return;
    }
    if (registering && password.length < 4) {
      setError('Пароль должен содержать не менее 4 символов.');
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (registering) {
        await api.register(email.trim(), password, firstName.trim(), lastName.trim());
        setRegistering(false);
        setPassword('');
        setInfo('Аккаунт создан. Теперь войдите.');
      } else await onLogin(await api.login(email.trim(), password));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { borderColor: t.border }]}>
        <Avatar name="T" general />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]}>twitter.</Text>
          <Text style={[styles.subtitle, { color: t.icon }]}>Место для общения</Text>
        </View>
        <IconButton
          name="settings"
          label="Настройки подключения"
          onPress={onSettings}
          disabled={busy}
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
      >
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: 18 }}>
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: t.tint, fontWeight: '600', fontSize: 12, letterSpacing: 1.4 }}>
              РАДЫ ВАС ВИДЕТЬ
            </Text>
            <Text style={{ color: t.text, fontSize: 30, fontWeight: '700', marginTop: 12 }}>
              {registering ? 'Присоединяйтесь' : 'С возвращением'}
            </Text>
            <Text style={{ color: t.icon, lineHeight: 22, marginTop: 8 }}>
              {registering
                ? 'Создайте аккаунт и начните общение.'
                : 'Войдите в аккаунт Twitter, чтобы продолжить разговор.'}
            </Text>
          </View>
          {registering && (
            <>
              <Field
                label="Имя"
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
                editable={!busy}
              />
              <Field
                label="Фамилия"
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
                editable={!busy}
              />
            </>
          )}
          <Field
            label="Электронная почта"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
          <Field
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={registering ? 'new-password' : 'current-password'}
            editable={!busy}
            onSubmitEditing={submit}
          />
          <Notice text={error || message} />
          {!!info && (
            <Text accessibilityLiveRegion="polite" style={{ color: t.tint }}>
              {info}
            </Text>
          )}
          <Button onPress={submit} busy={busy}>
            {registering ? 'Создать аккаунт' : 'Войти'}
          </Button>
          <Button
            secondary
            disabled={busy}
            onPress={() => {
              setRegistering((value) => !value);
              setError('');
              setInfo('');
            }}
          >
            {registering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </Button>
          <Text style={{ color: t.icon, fontSize: 12, textAlign: 'center', marginTop: 16 }}>
            Ближе друг к другу. Одно сообщение за раз.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
