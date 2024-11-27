import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Text, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native'
import MapView, { Marker, Region } from 'react-native-maps'
import { IconSymbol } from '@/components/ui/IconSymbol'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GasStations } from '@/constants/GasStations'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Colors } from '@/constants/Colors'

interface GasStation {
  id: string
  name: string
  prices: {
    92?: number
    95?: number
    98?: number
    100?: number
  }
  location: {
    latitude: number
    longitude: number
  }
  services: string[]
  promotions?: string
}

interface UserLocation {
  latitude: number
  longitude: number
}

const servicesAvailable: string[] = [...new Set(GasStations.flatMap((station) => station.services))]

const MapScreen: React.FC = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [gasStations, setGasStations] = useState<GasStation[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [filteredStations, setFilteredStations] = useState<GasStation[]>([])
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [detailStation, setDetailStation] = useState<GasStation | null>(null)

  const colorScheme = useColorScheme()

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.log('Permission to access location was denied')
        return
      }
      let location = await Location.getCurrentPositionAsync({})
      setUserLocation(location.coords as UserLocation)
    }
    getLocation()
  }, [])

  useEffect(() => {
    const fetchGasStations = async () => {
      setGasStations(GasStations)
    }
    fetchGasStations()
  }, [])

  useEffect(() => {
    const loadFavorites = async () => {
      const storedFavorites = JSON.parse((await AsyncStorage.getItem('favorites')) ?? '[]') || []
      setFavorites(storedFavorites)
    }
    loadFavorites()
  }, [])

  useEffect(() => {
    const filterStations = () => {
      const stationsToFilter = showFavorites
        ? gasStations.filter((station) => favorites.includes(station.id))
        : gasStations
      if (selectedServices.length === 0) {
        setFilteredStations(stationsToFilter)
      } else {
        setFilteredStations(
          stationsToFilter.filter((station) => selectedServices.every((service) => station.services.includes(service)))
        )
      }
    }
    filterStations()
  }, [selectedServices, gasStations, showFavorites, favorites])

  const toggleFavorite = async (stationId: string) => {
    const newFavorites = favorites.includes(stationId)
      ? favorites.filter((id) => id !== stationId)
      : [...favorites, stationId]
    setFavorites(newFavorites)
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites))
  }

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service))
    } else {
      setSelectedServices([...selectedServices, service])
    }
  }

  const resetFilters = () => {
    setSelectedServices([])
  }

  const closeModal = () => {
    setFilterModalVisible(false)
  }

  const handleMarkerPress = (station: GasStation) => {
    setDetailModalVisible(true)
    setDetailStation(station)
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => setFilterModalVisible(true)}>
          <Text style={styles.buttonText}>Фильтровать услуги</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setShowFavorites(!showFavorites)}>
          <Text style={styles.buttonText}>{showFavorites ? 'Показать все' : 'Избранные'}</Text>
        </TouchableOpacity>
      </View>
      <MapView
        style={styles.map}
        initialRegion={
          {
            latitude: userLocation ? userLocation.latitude : 56.838011,
            longitude: userLocation ? userLocation.longitude : 60.597474,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          } as Region
        }
      >
        {userLocation && <Marker coordinate={userLocation} title="Вы здесь" />}
        {filteredStations.map((station) => (
          <Marker
            key={station.id}
            coordinate={station.location}
            pinColor="red"
            onPress={() => handleMarkerPress(station)}
            // title={station.name}
            // image={require('@/assets/images/icons8-gas-station-64.png')}
          />
        ))}
      </MapView>
      <Modal animationType="slide" transparent={true} visible={filterModalVisible}>
        <View style={{ backgroundColor: Colors[colorScheme ?? 'light'].background, ...styles.modalContainer }}>
          {servicesAvailable.map((service) => (
            <TouchableOpacity
              key={service}
              style={[styles.serviceButton, selectedServices.includes(service) && styles.selectedServiceButton]}
              onPress={() => toggleService(service)}
            >
              <Text style={{ ...styles.buttonText, color: Colors[colorScheme ?? 'light'].text }}>{service}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.button} onPress={resetFilters}>
            <Text style={styles.buttonText}>Сбросить фильтры</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={closeModal}>
            <Text style={styles.buttonText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDetailModalVisible(false)}>
          <View style={styles.modalDetailContainer}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalDetailContent}>
                {detailStation && (
                  <>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailStationName}>{detailStation.name}</Text>
                      {Object.entries(detailStation.prices).map(([key, value]) => (
                        <Text key={key}>
                          {key}: {value}₽
                        </Text>
                      ))}
                      {detailStation.promotions && <Text>Акции: {detailStation.promotions}</Text>}
                    </View>
                    <View style={styles.detailButtonContainer}>
                      <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                        <IconSymbol size={28} name="clear" color={'black'} />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => toggleFavorite(detailStation.id)}>
                        <IconSymbol
                          size={48}
                          name={favorites.includes(detailStation.id) ? 'heart.fill' : 'heart'}
                          color={'black'}
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 100,
  },
  modalDetailContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDetailContent: {
    height: 200,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailTextContainer: {
    flex: 1,
    paddingRight: 20,
  },
  detailStationName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  detailButtonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  serviceButton: {
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderRadius: 5,
  },
  selectedServiceButton: {
    backgroundColor: '#007BFF',
  },
})

export default MapScreen
