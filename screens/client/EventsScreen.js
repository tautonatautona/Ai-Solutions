import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-virtualized-view'
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';

const EventsScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userBookings, setUserBookings] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchUserBookings();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = [];
      eventsSnapshot.forEach(doc => {
        eventsData.push({ id: doc.id, ...doc.data() });
      });
      setEvents(eventsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch events: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBookings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.uid));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = {};
      bookingsSnapshot.forEach(doc => {
        const data = doc.data();
        bookingsData[data.eventId] = { id: doc.id, ...data };
      });
      setUserBookings(bookingsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch your bookings: ' + error.message);
    }
  };

  const createReminder = async (userId, event, bookingDate) => {
    try {
      const reminderTitle = `Demo Reminder: ${event.eventName || event.title}`;
      const reminderDescription = `Your demo for "${event.eventName || event.title}" is scheduled on ${new Date(bookingDate).toLocaleString()}.`;
      await addDoc(collection(db, 'reminders'), {
        userId,
        eventId: event.id,
        title: reminderTitle,
        description: reminderDescription,
        date: bookingDate,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create reminder:', error);
    }
  };

  const handleBookEvent = async (event) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to book events.');
        return;
      }
      if (userBookings[event.id]) {
        Alert.alert('Info', `You have already booked "${event.eventName || event.title}".`);
        return;
      }
      const bookingDate = event.date;
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        eventId: event.id,
        userId: user.uid,
        eventName: event.eventName || event.title,
        date: bookingDate,
        time: event.time || '',
        bookedAt: new Date()
      });
      setUserBookings(prev => ({
        ...prev,
        [event.id]: {
          id: bookingRef.id,
          eventId: event.id,
          eventName: event.eventName || event.title,
          date: bookingDate,
          time: event.time || ''
        }
      }));
      await createReminder(user.uid, event, bookingDate);
      Alert.alert('Success', `You have booked "${event.eventName || event.title}"`);
    } catch (error) {
      Alert.alert('Error', 'Failed to book event: ' + error.message);
    }
  };

  const handleViewBooking = (booking) => {
    navigation.navigate('EventDetail', { eventId: booking.eventId, bookingId: booking.id });
  };

  const filteredEvents = events.filter(event => {
    if (!searchQuery.trim()) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (event.eventName && event.eventName.toLowerCase().includes(lowerQuery)) ||
           (event.title && event.title.toLowerCase().includes(lowerQuery));
  });

  const renderEvent = ({ item }) => {
    const booking = userBookings[item.id];
    return (
      <TouchableOpacity style={styles.eventCard} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} activeOpacity={0.8}>
        <Text style={styles.eventTitle}>{item.eventName || item.title}</Text>
        <Text style={styles.eventInfo}>Date: {item.date}</Text>
        {item.time ? <Text style={styles.eventInfo}>Time: {item.time}</Text> : null}
        <Text style={styles.eventInfo}>Location: {item.location || 'TBD'}</Text>
        {booking ? (
          <TouchableOpacity style={styles.viewBookingButton} onPress={() => handleViewBooking(booking)} activeOpacity={0.7}>
            <Text style={styles.buttonText}>View Booking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.bookButton} onPress={() => handleBookEvent(item)} activeOpacity={0.7}>
            <Text style={styles.buttonText}>Book Event</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderBooking = ({ item }) => (
    <View style={styles.bookingCard}>
      <Text style={styles.bookingTitle}>{item.eventName}</Text>
      <Text style={styles.bookingInfo}>Date: {item.date}</Text>
      {item.time ? <Text style={styles.bookingInfo}>Time: {item.time}</Text> : null}
      <TouchableOpacity style={styles.viewBookingButton} onPress={() => handleViewBooking(item)} activeOpacity={0.7}>
        <Text style={styles.buttonText}>View Booking</Text>
      </TouchableOpacity>
    </View>
  );

  const userBookingsArray = Object.values(userBookings);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    await fetchUserBookings();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Upcoming Events & Promotions</Text>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            placeholderTextColor="#999"
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0055cc" style={styles.loadingIndicator} />
        ) : (
          <FlatList
            data={filteredEvents}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

        <Text style={styles.subHeader}>Your Booked Demos</Text>
        {userBookingsArray.length === 0 ? (
          <Text style={styles.noBookingsText}>You have no booked demos.</Text>
        ) : (
          <FlatList
            data={userBookingsArray}
            renderItem={renderBooking}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Chatbot')}
        activeOpacity={0.7}
      >
        <MaterialIcons name="chat" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    position: 'relative',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 15,
    textAlign: 'center',
    color: '#000',
  },
  subHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 10,
    marginLeft: 15,
    color: 'black',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
  },
  loadingIndicator: {
    marginTop: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  eventTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
    color: '#222',
  },
  eventInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  bookButton: {
    marginTop: 10,
    backgroundColor: '#0055cc',
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
  },
  viewBookingButton: {
    marginTop: 10,
    backgroundColor: '#34A853',
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
  },
  reminderButton: {
    marginTop: 10,
    backgroundColor: '#FFA500',
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  bookingTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
    color: '#222',
  },
  bookingInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#0055cc',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  noBookingsText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 16,
    marginTop: 10,
  },
});

export default EventsScreen;