import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId, bookingId } = route.params || {};
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userBooking, setUserBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
        setLoading(false);
      }
    };

    const fetchUserBooking = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        let bookingDoc;
        if (bookingId) {
          const bookingRef = doc(db, 'bookings', bookingId);
          const bookingSnap = await getDoc(bookingRef);
          if (bookingSnap.exists()) {
            bookingDoc = { id: bookingSnap.id, ...bookingSnap.data() };
          }
        } else {
          const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.uid), where('eventId', '==', eventId));
          const bookingsSnapshot = await getDocs(bookingsQuery);
          if (!bookingsSnapshot.empty) {
            bookingDoc = bookingsSnapshot.docs[0].data();
            bookingDoc.id = bookingsSnapshot.docs[0].id;
          }
        }
        if (bookingDoc) {
          setUserBooking(bookingDoc);
          if (bookingDoc.date) {
            setSelectedDate(new Date(bookingDoc.date));
          }
        }
      } catch (error) {
        // Ignore booking fetch errors
      }
    };

    fetchEvent();
    fetchUserBooking();
  }, [eventId, bookingId]);

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setShowTimePicker(true); // Show time picker after selecting a date
    }
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(false);
    if (time) {
      const updatedDate = new Date(selectedDate);
      updatedDate.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(updatedDate);
      Alert.alert('Date and Time Selected', `You selected: ${updatedDate.toLocaleString()}`);
    }
  };

  const createReminder = async (userId, event, bookingDate) => {
    try {
      const reminderTitle = `Demo Reminder: ${event.eventName || event.title}`;
      // Parse bookingDate string to Date object for formatting
      const bookingDateObj = new Date(bookingDate);
      const formattedDate = isNaN(bookingDateObj.getTime()) ? bookingDate : bookingDateObj.toLocaleString();
      const reminderDescription = `Your demo for "${event.eventName || event.title}" is scheduled on ${formattedDate}.`;
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

  const handleBookEvent = async () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date and time for the demo.');
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to book events.');
        return;
      }
      if (userBooking) {
        Alert.alert('Info', 'You have already booked this event.');
        return;
      }
      const timeString = selectedDate.toTimeString().slice(0, 5);
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        eventId: event.id,
        userId: user.uid,
        eventName: event.eventName || event.title,
        date: selectedDate.toISOString(),
        time: timeString,
        bookedAt: new Date(),
      });
      setUserBooking({
        id: bookingRef.id,
        eventId: event.id,
        eventName: event.eventName || event.title,
        date: selectedDate.toISOString(),
        time: timeString,
      });
      await createReminder(user.uid, event, selectedDate.toISOString());
      Alert.alert('Success', 'You have booked this event.');
    } catch (error) {
      Alert.alert('Error', 'Failed to book event: ' + error.message);
    }
  };

  const handleCancelBooking = async () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel your demo booking?',
      [
        { text: 'No' },
        { text: 'Yes', onPress: async () => {
          try {
            const bookingRef = doc(db, 'bookings', userBooking.id);
            await deleteDoc(bookingRef);
            setUserBooking(null);
            setSelectedDate(new Date());
            Alert.alert('Success', 'Your demo booking has been cancelled.');
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel booking: ' + error.message);
          }
        }}
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading event details...</Text>
      </View>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{event.eventName || event.title}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{event.date}</Text>
        </View>
        {event.location ? (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{event.location}</Text>
          </View>
        ) : null}
        {event.description ? (
          <>
            <Text style={styles.sectionHeader}>Description</Text>
            <Text style={styles.description}>{event.description}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Demo Time</Text>
        <TouchableOpacity style={styles.bookButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.bookButtonText}>Select Date & Book Demo</Text>
        </TouchableOpacity>
        {userBooking ? (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking}>
            <Text style={styles.cancelButtonText}>Cancel Demo</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f4f8',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 25,
    color: '#222',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  label: {
    fontWeight: '700',
    width: 100,
    color: '#555',
  },
  value: {
    fontSize: 17,
    color: '#333',
    flexShrink: 1,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
    color: '#444',
  },
  description: {
    fontSize: 17,
    color: '#444',
    marginBottom: 25,
    lineHeight: 24,
  },
  timePickerButton: {
    marginVertical: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#4285F4',
    borderRadius: 30,
    alignItems: 'center',
  },
  timePickerText: {
    fontSize: 18,
    color: '#4285F4',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 25,
    backgroundColor: '#d9534f',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  bookButton: {
    marginTop: 25,
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
});

export default EventDetailScreen;
