import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { KeyboardChatViewProps } from './KeyboardChatView.types';

// Web uses the browser viewport rather than native keyboard subscriptions.
export function KeyboardChatView({ style, children, composer, ...props }: KeyboardChatViewProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View {...props} style={[style, { paddingBottom: bottom }]}>
      {children}
      {composer}
    </View>
  );
}
