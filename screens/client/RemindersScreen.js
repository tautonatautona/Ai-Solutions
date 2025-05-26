import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const RemindersScreen = ({ navigation }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [alertedReminders, setAlertedReminders] = useState(new Set());

  const fetchReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not logged in');
        setLoading(false);
        return;
      }
      const userId = user.uid;

      const remindersRef = collection(db, 'reminders');
      const q = query(remindersRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const remindersData = [];
      querySnapshot.forEach(doc => {
        remindersData.push({ id: doc.id, ...doc.data() });
      });

      remindersData.sort((a, b) => new Date(a.date) - new Date(b.date));

      setReminders(remindersData);
    } catch (error) {
      setError('Failed to load reminders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReminders();
    setRefreshing(false);
  };

  const addBookedEventReminder = async (event) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not logged in');
        return;
      }
      const userId = user.uid;

      const remindersRef = collection(db, 'reminders');
      // Ensure date is stored as Firestore Timestamp or ISO string
      let reminderDate;
      if (event.date && typeof event.date.toDate === 'function') {
        reminderDate = event.date.toDate();
      } else if (typeof event.date === 'string') {
        reminderDate = new Date(event.date);
      } else {
        reminderDate = new Date();
      }

      const newReminder = {
        userId,
        title: event.eventName || event.title || 'Booked Event',
        description: event.description || '',
        date: reminderDate.toISOString(),
        eventId: event.id || event.eventId || null,
        createdAt: new Date(),
      };

      await db.collection('reminders').add(newReminder);

      // Refresh reminders list
      fetchReminders();
    } catch (error) {
      console.error('Failed to add booked event reminder:', error);
      setError('Failed to add reminder');
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  useEffect(() => {
    if (reminders.length === 0) return;
    const now = new Date();
    reminders.forEach(reminder => {
      if (alertedReminders.has(reminder.id)) return;
      let reminderDate;
      try {
        if (reminder.date) {
          if (typeof reminder.date.toDate === 'function') {
            reminderDate = reminder.date.toDate();
          } else if (typeof reminder.date === 'string') {
            reminderDate = new Date(reminder.date);
          } else if (reminder.date.seconds) {
            reminderDate = new Date(reminder.date.seconds * 1000);
          } else if (reminder.date._seconds) {
            reminderDate = new Date(reminder.date._seconds * 1000);
          } else {
            reminderDate = new Date(reminder.date);
          }
        } else {
          reminderDate = new Date();
        }
      } catch {
        reminderDate = new Date();
      }
      if (reminderDate <= now) {
        alert(`Reminder: ${reminder.title}\n${reminder.description || ''}`);
        setAlertedReminders(prev => new Set(prev).add(reminder.id));
      }
    });
  }, [reminders, alertedReminders]);

  const handleReminderPress = (reminder) => {
    if (reminder.eventId) {
      navigation.navigate('EventDetail', { eventId: reminder.eventId });
    }
  };

  const renderReminderItem = ({ item }) => {
    let reminderDate;
    try {
      if (item.date) {
        // Check if Firestore Timestamp object
        if (typeof item.date.toDate === 'function') {
          reminderDate = item.date.toDate();
        } else if (typeof item.date === 'string') {
          // Check if string is in MM/DD/YYYY format and parse manually
          const mmddyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          const match = item.date.match(mmddyyyyRegex);
          if (match) {
            const month = parseInt(match[1], 10) - 1; // JS months 0-based
            const day = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);
            reminderDate = new Date(year, month, day);
          } else {
            reminderDate = new Date(item.date);
          }
        } else if (item.date.seconds) {
          // Firestore Timestamp object with seconds field
          reminderDate = new Date(item.date.seconds * 1000);
        } else if (item.date._seconds) {
          // Another Firestore Timestamp format
          reminderDate = new Date(item.date._seconds * 1000);
        } else {
          reminderDate = new Date(item.date);
        }
      } else {
        reminderDate = new Date();
      }
    } catch (e) {
      console.warn('Error parsing reminder date:', e, item.date);
      reminderDate = new Date();
    }
    const now = new Date();
    const diffMs = reminderDate - now;
    const diffMinutes = Math.floor(diffMs / 60000);

    let timeString = '';
    if (isNaN(reminderDate.getTime())) {
      timeString = 'Invalid date';
    } else if (diffMinutes < 1) {
      timeString = 'Now';
    } else if (diffMinutes < 60) {
      timeString = `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} left`;
    } else {
      timeString = reminderDate.toLocaleString();
    }

    return (
      <TouchableOpacity style={styles.reminderItem} onPress={() => handleReminderPress(item)} activeOpacity={0.7}>
        <View style={styles.reminderIcon}>
          <Text style={styles.reminderIconText}>⏰</Text>
        </View>
        <View style={styles.reminderTextContainer}>
          <Text style={styles.reminderTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.reminderDescription}>{item.description}</Text> : null}
        </View>
        <Text style={styles.reminderTime}>{timeString}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0055cc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (reminders.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No reminders found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Reminders</Text>
      <FlatList
        data={reminders}
        renderItem={renderReminderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
    color: '#d35400',
    textAlign: 'center',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#f5cba7',
    borderBottomWidth: 1,
  },
  reminderIcon: {
    marginRight: 15,
  },
  reminderIconText: {
    fontSize: 20,
    color: '#d35400',
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#d35400',
  },
  reminderDescription: {
    color: '#a04000',
    marginTop: 2,
    fontSize: 14,
  },
  reminderTime: {
    color: '#a04000',
    fontSize: 12,
    marginLeft: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default RemindersScreen;
