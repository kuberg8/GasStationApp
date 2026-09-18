import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTwitterTheme } from './theme';
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTwitterTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, { opacity: disabled ? 0.35 : pressed ? 0.55 : 1 }]}
    >
      <MaterialIcons name={name} size={24} color={t.tint} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  busy,
  disabled,
  secondary = false,
}: {
  children: ReactNode;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const t = useTwitterTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? t.surface : t.tint,
          opacity: busy || disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? t.tint : t.buttonText} />
      ) : (
        <Text style={{ color: secondary ? t.tint : t.buttonText, fontSize: 15, fontWeight: '600' }}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
export function Field(props: TextInputProps & { label?: string }) {
  const t = useTwitterTheme();
  return (
    <View style={{ gap: 7 }}>
      {props.label && (
        <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>{props.label}</Text>
      )}
      <TextInput
        placeholderTextColor={t.icon}
        accessibilityLabel={props.label || props.placeholder}
        {...props}
        style={[
          styles.input,
          { color: t.text, backgroundColor: t.surface, borderColor: t.border },
          props.style,
        ]}
      />
    </View>
  );
}
export function Notice({ text, retry }: { text: string; retry?: () => void }) {
  const t = useTwitterTheme();
  if (!text) return null;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: t.surface }]}>
      <Text style={{ color: t.danger, flex: 1, lineHeight: 20 }}>{text}</Text>
      {retry && <IconButton label="Повторить" name="refresh" onPress={retry} />}
    </View>
  );
}
export function Avatar({
  name,
  general,
  online,
}: {
  name: string;
  general?: boolean;
  online?: boolean;
}) {
  const t = useTwitterTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: t.outgoing }]}>
      {general ? (
        <MaterialIcons name="forum" color={t.tint} size={22} />
      ) : (
        <Text style={{ color: t.tint, fontSize: 20, fontWeight: '600' }}>
          {name.slice(0, 1).toUpperCase()}
        </Text>
      )}
      {online && (
        <View
          accessibilityLabel="В сети"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 1,
            width: 11,
            height: 11,
            borderRadius: 6,
            backgroundColor: t.tint,
            borderWidth: 2,
            borderColor: t.background,
          }}
        />
      )}
    </View>
  );
}
export const styles = StyleSheet.create({
  icon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    minHeight: 48,
  },
  notice: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
});
