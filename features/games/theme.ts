import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useGameColors() {
  const dark = useColorScheme() === 'dark';
  return {
    ...Colors[dark ? 'dark' : 'light'],
    surface: dark ? '#202B31' : '#EAF2F6',
    accent: dark ? '#7CD4F3' : '#087C9F',
    opponent: dark ? '#F7BC8A' : '#B6571D',
    winning: dark ? '#214E47' : '#D4EFE5',
  };
}
