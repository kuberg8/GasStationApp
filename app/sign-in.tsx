import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreen } from '@/features/twitter/AuthScreen';
import { useAuth } from '@/features/twitter/AuthProvider';
import { useTwitterTheme } from '@/features/twitter/theme';
export default function SignIn() {
  const { endpoints, login, error, openSettings } = useAuth();
  const t = useTwitterTheme();
  if (!endpoints) return null;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <AuthScreen
          key={endpoints.api}
          endpoints={endpoints}
          onLogin={login}
          onSettings={openSettings}
          message={error}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
