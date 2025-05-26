import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const UserDetailScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data());
        } else {
          Alert.alert('Error', 'User not found');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch user: ' + error.message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>User Details</Text>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{user.userDetails?.name || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user.userDetails?.email || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Role:</Text>
        <Text style={styles.value}>{user.role || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{user.status || 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Created At:</Text>
        <Text style={styles.value}>{user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
    width: 100,
    color: '#555',
  },
  value: {
    fontSize: 16,
    color: '#222',
    flexShrink: 1,
  },
});

export default UserDetailScreen;
