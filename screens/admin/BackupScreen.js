import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { db } from '../../firebaseConfig';
import { collection, getDocs, setDoc, doc, getDoc, query, orderBy, limit, addDoc } from 'firebase/firestore';

const BackupScreen = () => {
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [backupStatus, setBackupStatus] = useState('No backups found');
  const [backupLogs, setBackupLogs] = useState([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Load last backup info and backup logs
  useEffect(() => {
    const loadLastBackup = async () => {
      const lastBackupDoc = await getDoc(doc(db, 'backups', 'last'));
      if (lastBackupDoc.exists()) {
        const data = lastBackupDoc.data();
        setLastBackup(new Date(data.timestamp).toLocaleString());
        setBackupStatus(`Last backup: ${data.size} items`);
      }
    };

    const loadBackupLogs = async () => {
      const logsQuery = query(collection(db, 'backupLogs'), orderBy('timestamp', 'desc'), limit(20));
      const logsSnapshot = await getDocs(logsQuery);
      const logs = [];
      logsSnapshot.forEach(doc => {
        logs.push(doc.data());
      });
      setBackupLogs(logs);
    };

    loadLastBackup();
    loadBackupLogs();
  }, []);

  const logBackupOperation = async (status, details) => {
    await addDoc(collection(db, 'backupLogs'), {
      timestamp: new Date().getTime(),
      status,
      details,
    });
  };

  const handleBackup = async () => {
    try {
      setLoading(true);

      // Get users data
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = {};
      usersSnapshot.forEach(doc => {
        usersData[doc.id] = doc.data();
      });

      // Get chats data
      const chatsSnapshot = await getDocs(collection(db, 'chatMessages'));
      const chatsData = {};
      chatsSnapshot.forEach(doc => {
        chatsData[doc.id] = doc.data();
      });

      // Get clients data
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = {};
      clientsSnapshot.forEach(doc => {
        clientsData[doc.id] = doc.data();
      });

      // Get bookings data
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsData = {};
      bookingsSnapshot.forEach(doc => {
        bookingsData[doc.id] = doc.data();
      });

      // Get events data
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = {};
      eventsSnapshot.forEach(doc => {
        eventsData[doc.id] = doc.data();
      });

      // Get escalations data
      const escalationsSnapshot = await getDocs(collection(db, 'escalations'));
      const escalationsData = {};
      escalationsSnapshot.forEach(doc => {
        escalationsData[doc.id] = doc.data();
      });

      // Prepare backup data
      const backupData = {
        timestamp: new Date().getTime(),
        users: usersData,
        chats: chatsData,
        clients: clientsData,
        bookings: bookingsData,
        events: eventsData,
        escalations: escalationsData,
        usersCount: usersSnapshot.size,
        chatsCount: chatsSnapshot.size,
        clientsCount: clientsSnapshot.size,
        bookingsCount: bookingsSnapshot.size,
        eventsCount: eventsSnapshot.size,
        escalationsCount: escalationsSnapshot.size,
      };

      // Save backup data in Firestore with timestamp as doc id
      const backupDocRef = doc(db, 'backups', new Date().toISOString());
      await setDoc(backupDocRef, backupData);

      // Update last backup metadata
      const lastBackupDocRef = doc(db, 'backups', 'last');
      await setDoc(lastBackupDocRef, {
        timestamp: backupData.timestamp,
        size: backupData.usersCount + backupData.chatsCount + backupData.clientsCount + backupData.bookingsCount + backupData.eventsCount + backupData.escalationsCount,
      });

      // Log backup success
      await logBackupOperation('success', `Backed up ${backupData.usersCount} users, ${backupData.chatsCount} chats, ${backupData.clientsCount} clients, ${backupData.bookingsCount} bookings, ${backupData.eventsCount} events, and ${backupData.escalationsCount} escalations.`);

      Alert.alert('Success', 'Backup completed successfully');
    } catch (error) {
      // Log backup failure
      await logBackupOperation('failure', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    try {
      setRecoveryLoading(true);

      // Get last backup metadata
      const lastBackupDoc = await getDoc(doc(db, 'backups', 'last'));
      if (!lastBackupDoc.exists()) {
        Alert.alert('No backup found', 'There is no backup data to recover.');
        setRecoveryLoading(false);
        return;
      }
      const lastBackupData = lastBackupDoc.data();

      // Get backup data by timestamp id
      const backupDocRef = doc(db, 'backups', new Date(lastBackupData.timestamp).toISOString());
      const backupDoc = await getDoc(backupDocRef);
      if (!backupDoc.exists()) {
        Alert.alert('Backup data missing', 'Backup data could not be found.');
        setRecoveryLoading(false);
        return;
      }
      const backupData = backupDoc.data();

      // Restore users collection
      for (const [userId, userData] of Object.entries(backupData.users)) {
        await setDoc(doc(db, 'users', userId), userData);
      }

      // Restore chats collection
      for (const [chatId, chatData] of Object.entries(backupData.chats)) {
        await setDoc(doc(db, 'chatMessages', chatId), chatData);
      }

      // Restore clients collection
      for (const [clientId, clientData] of Object.entries(backupData.clients)) {
        await setDoc(doc(db, 'clients', clientId), clientData);
      }

      // Restore bookings collection
      for (const [bookingId, bookingData] of Object.entries(backupData.bookings)) {
        await setDoc(doc(db, 'bookings', bookingId), bookingData);
      }

      // Restore events collection
      for (const [eventId, eventData] of Object.entries(backupData.events)) {
        await setDoc(doc(db, 'events', eventId), eventData);
      }

      // Restore escalations collection
      for (const [escalationId, escalationData] of Object.entries(backupData.escalations)) {
        await setDoc(doc(db, 'escalations', escalationId), escalationData);
      }

      Alert.alert('Success', 'Recovery completed successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    const logsQuery = query(collection(db, 'backupLogs'), orderBy('timestamp', 'desc'), limit(20));
    const logsSnapshot = await getDocs(logsQuery);
    const logs = [];
    logsSnapshot.forEach(doc => {
      logs.push(doc.data());
    });
    setBackupLogs(logs);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Database Backup & Recovery</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{backupStatus}</Text>
        {lastBackup && <Text style={styles.timestamp}>Created: {lastBackup}</Text>}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleBackup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Backup Now</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.recoveryButton]}
        onPress={handleRecovery}
        disabled={recoveryLoading}
      >
        {recoveryLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Recover Last Backup</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.refreshButton]}
        onPress={handleRefreshLogs}
      >
        <Text style={styles.buttonText}>Refresh Backup Logs</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Backups are stored in Firestore and include:
        </Text>
        <Text style={styles.infoItem}>• User accounts</Text>
        <Text style={styles.infoItem}>• Chat logs and history</Text>
        <Text style={styles.infoItem}>• System settings</Text>
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsHeader}>Backup Logs</Text>
        {backupLogs.length === 0 ? (
          <Text style={styles.noLogsText}>No backup logs available.</Text>
        ) : (
          backupLogs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <Text style={styles.logTimestamp}>{new Date(log.timestamp).toLocaleString()}</Text>
              <Text style={[styles.logStatus, log.status === 'success' ? styles.success : styles.failure]}>
                {log.status.toUpperCase()}
              </Text>
              <Text style={styles.logDetails}>{log.details}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#4285F4'
  },
  timestamp: {
    fontSize: 14,
    color: '#666'
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },
  recoveryButton: {
    backgroundColor: '#34A853',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  infoBox: {
    backgroundColor: '#e8f4ff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c2e0ff',
    marginBottom: 20
  },
  infoText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333'
  },
  infoItem: {
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 5,
    color: '#555'
  },
  logsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  logsHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  noLogsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  logEntry: {
    marginBottom: 10,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  logStatus: {
    fontWeight: '700',
    fontSize: 14,
  },
  success: {
    color: '#34A853',
  },
  failure: {
    color: '#EA4335',
  },
  logDetails: {
    fontSize: 14,
    color: '#444',
  },
  refreshButton: {
    backgroundColor: '#F4B400',
    marginBottom: 20,
  },
});

export default BackupScreen;
