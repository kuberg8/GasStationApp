import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
export function useTwitterTheme() {
  const dark = useColorScheme() === 'dark';
  const colors = Colors[dark ? 'dark' : 'light'];
  return {
    ...colors,
    surface: dark ? '#202426' : '#E9EEF1',
    border: dark ? '#343A3E' : '#E3E8EB',
    outgoing: dark ? '#2C373D' : '#D5EBF5',
    danger: dark ? '#FFB4AB' : '#B3261E',
    buttonText: colors.background,
  };
}
export type TwitterTheme = ReturnType<typeof useTwitterTheme>;
