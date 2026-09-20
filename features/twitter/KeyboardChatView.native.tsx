import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardStickyView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { KeyboardChatViewProps } from './KeyboardChatView.types';

export function KeyboardChatView({ style, children, composer, ...props }: KeyboardChatViewProps) {
  const { bottom } = useSafeAreaInsets();
  const [composerHeight, setComposerHeight] = useState(0);
  const { height, progress } = useReanimatedKeyboardAnimation();
  const contentStyle = useAnimatedStyle(() => ({
    // Controller heights are negative. Match StickyView's interpolated safe-area offset.
    paddingBottom: composerHeight - height.value + bottom * (1 - progress.value),
  }));
  return (
    <View {...props} style={style}>
      <Animated.View testID="keyboard-chat-content" style={[{ flex: 1 }, contentStyle]}>
        {children}
      </Animated.View>
      <KeyboardStickyView
        testID="keyboard-composer-dock"
        offset={{ closed: -bottom, opened: 0 }}
        onLayout={({ nativeEvent }) => setComposerHeight(nativeEvent.layout.height)}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        {composer}
      </KeyboardStickyView>
    </View>
  );
}
