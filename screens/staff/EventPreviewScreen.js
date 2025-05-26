import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Button,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Video } from 'expo-av';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const EventPreviewScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [videoStatus, setVideoStatus] = useState({ isLoading: true, error: null });
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() });
        } else {
          Alert.alert('Error', 'Event not found');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch event details: ' + error.message);
        navigation.goBack();
      } finally {
        setLoadingEvent(false);
      }
    };

    const fetchBookings = async () => {
      try {
        const bookingsQuery = query(collection(db, 'bookings'), where('eventId', '==', eventId));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookings(bookingsData);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch bookings: ' + error.message);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchEvent();
    fetchBookings();
  }, [eventId]);

  const cancelBooking = async (bookingId) => {
    Alert.alert(
      'Confirm Cancel',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'bookings', bookingId));
              Alert.alert('Cancelled', 'Booking cancelled successfully');
              // Refresh bookings
              const bookingsQuery = query(collection(db, 'bookings'), where('eventId', '==', eventId));
              const bookingsSnapshot = await getDocs(bookingsQuery);
              const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setBookings(bookingsData);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderBooking = ({ item }) => (
    <View style={styles.bookingItem}>
      <Text style={styles.bookingUser}>{item.userName || 'Unknown User'}</Text>
      <Text style={styles.bookingDetails}>Booking ID: {item.id}</Text>
      <Button title="Cancel Booking" color="red" onPress={() => cancelBooking(item.id)} />
    </View>
  );

  if (loadingEvent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#004080" />
        <Text>Loading event details...</Text>
      </View>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{event.eventName || event.title}</Text>
      <Text style={styles.label}>Date: <Text style={styles.value}>{event.date}</Text></Text>
      {event.location ? (
        <Text style={styles.label}>Location: <Text style={styles.value}>{event.location}</Text></Text>
      ) : null}
      {event.description ? (
        <>
          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.description}>{event.description}</Text>
        </>
      ) : null}
      {event.videoLink ? (
        <>
          <Text style={styles.sectionHeader}>Video</Text>
          {videoStatus.isLoading && (
            <ActivityIndicator size="small" color="#004080" />
          )}
          {videoStatus.error && (
            <Text style={{ color: 'red', marginBottom: 10 }}>
              Error loading video: {videoStatus.error?.message ?? JSON.stringify(videoStatus.error)}
            </Text>
          )}
          <Video
            ref={videoRef}
            source={{ uri: event.videoLink }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="contain"
            shouldPlay={false}
            useNativeControls
            style={styles.videoPlayer}
            onLoadStart={() => setVideoStatus({ isLoading: true, error: null })}
            onLoad={() => setVideoStatus({ isLoading: false, error: null })}
            onError={(e) => setVideoStatus({ isLoading: false, error: e.nativeEvent || e })}
          />
        </>
      ) : null}

      <View style={styles.bookingsSection}>
        <Text style={styles.sectionHeader}>Bookings</Text>
        {loadingBookings ? (
          <ActivityIndicator size="small" color="#004080" />
        ) : bookings.length === 0 ? (
          <Text style={styles.noBookings}>No bookings found.</Text>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={renderBooking}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9faff',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#003366',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#004080',
  },
  value: {
    fontWeight: '400',
    color: '#222',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    color: '#004080',
  },
  description: {
    fontSize: 16,
    color: '#444',
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  bookingsSection: {
    marginTop: 30,
  },
  noBookings: {
    fontStyle: 'italic',
    color: '#666',
  },
  bookingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  bookingUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  bookingDetails: {
    fontSize: 14,
    color: '#555',
  },
});

export default EventPreviewScreen;
