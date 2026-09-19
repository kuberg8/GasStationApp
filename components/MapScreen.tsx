import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const initialRegion = {
  latitude: 56.838011,
  longitude: 60.597474,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export default function MapScreen() {
  const map = useRef<MapView>(null);
  const mounted = useRef(false);
  const locating = useRef(false);
  const [ready, setReady] = useState(false);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const locate = useCallback(async () => {
    if (locating.current) return;
    locating.current = true;
    setLoading(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;
      setAllowed(permission.granted);
      if (!permission.granted) {
        setError(
          'Разрешите доступ к геолокации в настройках телефона, чтобы видеть своё местоположение.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (mounted.current) setLocation(position.coords);
    } catch {
      if (mounted.current)
        setError(
          'Не удалось определить местоположение. Проверьте геолокацию и повторите попытку.',
        );
    } finally {
      locating.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void locate();
    return () => {
      mounted.current = false;
    };
  }, [locate]);

  useEffect(() => {
    if (!ready || !location) return;
    map.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      350,
    );
  }, [ready, location]);

  return (
    <View style={styles.container}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onMapReady={() => setReady(true)}
        showsUserLocation={allowed}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
      />
      <View style={[styles.controls, { top: insets.top + 16 }]}>
        {error ? (
          <Text
            accessibilityRole="alert"
            style={[styles.notice, { color: colors.text, backgroundColor: colors.background }]}
          >
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Моё местоположение"
          accessibilityState={{ busy: loading, disabled: loading }}
          disabled={loading}
          onPress={() => void locate()}
          style={[styles.button, { backgroundColor: colors.background }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <MaterialIcons name="my-location" size={24} color={colors.tint} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { position: 'absolute', left: 16, right: 16, alignItems: 'flex-end', gap: 12 },
  button: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  notice: { padding: 14, borderRadius: 12, fontSize: 14, lineHeight: 20 },
});
