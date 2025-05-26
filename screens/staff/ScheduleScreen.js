import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Alert,
  Modal,
  Button,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const ScheduleScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [editingEventId, setEditingEventId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingsCount, setBookingsCount] = useState({});
  const [viewsCount, setViewsCount] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [bookings, setBookings] = useState([]);

  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalEscalations, setTotalEscalations] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const eventsData = [];
      snapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() });
      });
      setEvents(eventsData);
      setFilteredEvents(eventsData);
    }, (error) => {
      Alert.alert('Error', 'Failed to fetch events: ' + error.message);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!searchText) {
      setFilteredEvents(events);
    } else {
      const lowerSearch = searchText.toLowerCase();
      const filtered = events.filter(event =>
        event.eventName.toLowerCase().includes(lowerSearch) ||
        (event.description && event.description.toLowerCase().includes(lowerSearch))
      );
      setFilteredEvents(filtered);
    }
  }, [searchText, events]);

  useEffect(() => {
    // Fetch total users count
    const fetchTotalUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        setTotalUsers(usersSnapshot.size);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch total users: ' + error.message);
      }
    };

    // Fetch active users count (assuming 'active' field or last login within timeframe)
    const fetchActiveUsers = async () => {
      try {
        // Example: users with lastLogin within last 24 hours
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const q = query(collection(db, 'users'), where('lastLogin', '>=', yesterday));
        const activeSnapshot = await getDocs(q);
        setActiveUsers(activeSnapshot.size);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch active users: ' + error.message);
      }
    };

    // Fetch total bookings count
    const fetchTotalBookings = async () => {
      try {
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        setTotalBookings(bookingsSnapshot.size);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch total bookings: ' + error.message);
      }
    };

    // Fetch total escalations count
    const fetchTotalEscalations = async () => {
      try {
        const escalationsSnapshot = await getDocs(collection(db, 'escalations'));
        setTotalEscalations(escalationsSnapshot.size);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch total escalations: ' + error.message);
      }
    };

    fetchTotalUsers();
    fetchActiveUsers();
    fetchTotalBookings();
    fetchTotalEscalations();
  }, []);

  const clearForm = () => {
    setEventName('');
    setDescription('');
    setDate(new Date());
    setTime(new Date());
    setEditingEventId(null);
  };


  // Removed addModalVisible and handleAddOrUpdate since modal is replaced by screen navigation

  const handleEdit = (event) => {
    setEventName(event.eventName);
    setDescription(event.description || '');
    setDate(new Date(event.date));
    setTime(new Date('1970-01-01T' + event.time + ':00'));
    setEditingEventId(event.id);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'events', id));
              Alert.alert('Deleted', 'Event deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const openViewersModal = async (event) => {
    setSelectedEvent(event);
    await fetchViewers(event.id);
    setModalVisible(true);
  };

  const openAnalyticsModal = async (event) => {
    setSelectedEvent(event);
    await fetchBookings(event.id);
    setAnalyticsModalVisible(true);
  };

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
              fetchBookingsCount();
              fetchViewers(selectedEvent.id);
              fetchBookings(selectedEvent.id);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.eventItem}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('EventPreview', { eventId: item.id })}
    >
      <Text style={styles.eventTitle}>{item.eventName}</Text>
      <Text style={styles.eventDescription}>{item.description || 'No description'}</Text>
      <Text style={styles.eventDateTime}>{item.date} {item.time}</Text>
      <View style={styles.countsRow}>
        <View style={styles.countBox}>
          <Text style={styles.countNumber}>{viewsCount[item.id] || 0}</Text>
          <Text style={styles.countLabel}>Views</Text>
        </View>
        <View style={styles.countBox}>
          <Text style={styles.countNumber}>{bookingsCount[item.id] || 0}</Text>
          <Text style={styles.countLabel}>Bookings</Text>
        </View>
      </View>
      <View style={styles.eventButtons}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton}>
          <Icon name="create-outline" size={24} color="#0055cc" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
          <Icon name="trash-outline" size={24} color="#cc0000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openAnalyticsModal(item)} style={styles.iconButton}>
          <Icon name="analytics-outline" size={24} color="#28a745" />
        </TouchableOpacity>
      </View>
      <View style={styles.videoContainer}>
        {item.videoLink ? (
          <Text style={styles.videoLabel}>Video Link:</Text>
        ) : null}
        {item.videoLink ? (
          <Text style={styles.videoLink} numberOfLines={1} ellipsizeMode="tail">{item.videoLink}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderViewer = ({ item }) => (
    <View style={styles.viewerItem}>
      <Text style={styles.viewerName}>{item.userName || 'Unknown User'}</Text>
      <Button title="Cancel Booking" color="red" onPress={() => cancelBooking(item.bookingId)} disabled={!item.bookingId} />
    </View>
  );

  const renderBooking = ({ item }) => (
    <View style={styles.bookingItem}>
      <Text style={styles.bookingUser}>{item.userName || 'Unknown User'}</Text>
      <Text style={styles.bookingDetails}>Booking ID: {item.id}</Text>
      <Button title="Cancel Booking" color="red" onPress={() => cancelBooking(item.id)} />
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search"
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={setSearchText}
      />
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalUsers}</Text>
          <Text style={styles.statLabel}>Total users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeUsers}</Text>
          <Text style={styles.statLabel}>Active users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalBookings}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalEscalations}</Text>
          <Text style={styles.statLabel}>Total escalations</Text>
        </View>
      </View>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.eventsList}
        keyboardShouldPersistTaps="handled"
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddEvent')}>
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>
      {/* Removed renderAddModal */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalHeader}>Viewers of {selectedEvent?.eventName}</Text>
          {viewers.length === 0 ? (
            <Text style={styles.noViewers}>No viewers found.</Text>
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(item) => item.id}
              renderItem={renderViewer}
            />
          )}
          <Button title="Close" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>

      <Modal
        visible={analyticsModalVisible}
        animationType="slide"
        onRequestClose={() => setAnalyticsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalHeader}>Bookings for {selectedEvent?.eventName}</Text>
          {bookings.length === 0 ? (
            <Text style={styles.noViewers}>No bookings found.</Text>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id}
              renderItem={renderBooking}
            />
          )}
          <Button title="Close" onPress={() => setAnalyticsModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: '#f9faff',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 24,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#004080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#004080',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#004080',
  },
  eventsList: {
    paddingBottom: 100,
  },
  eventItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#004080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 8,
    color: '#003366',
    flexShrink: 1,
  },
  eventDescription: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 8,
    color: '#4d4d4d',
    flexShrink: 1,
  },
  eventDateTime: {
    fontSize: 16,
    marginBottom: 12,
    color: '#1a1a1a',
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 20,
  },
  countBox: {
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#004080',
  },
  countLabel: {
    fontSize: 14,
    color: '#004080',
  },
  eventButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  iconButton: {
    marginLeft: 16,
  },
  videoContainer: {
    marginTop: 12,
  },
  videoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#003366',
    marginBottom: 4,
  },
  videoLink: {
    fontSize: 14,
    color: '#1a73e8',
    textDecorationLine: 'underline',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#004080',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#004080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#003366',
  },
  noViewers: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
    color: '#999',
    fontSize: 18,
  },
  viewerItem: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewerName: {
    fontSize: 18,
    color: '#222',
  },
  bookingItem: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  bookingUser: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  bookingDetails: {
    fontSize: 16,
    color: '#555',
  },
  loadingIndicator: {
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default ScheduleScreen;
