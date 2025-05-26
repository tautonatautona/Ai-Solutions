import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const CustomerDatabaseScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const usersCollection = collection(db, 'clients');
        const querySnapshot = await getDocs(usersCollection);
        const clients = [];
        querySnapshot.forEach((doc) => {
          clients.push({ id: doc.id, ...doc.data() });
        });
        setCustomers(clients);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch clients: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const getInitials = (name) => {
    if (!name) return '';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery.trim()) {
      return true;
    }
    const lowerQuery = searchQuery.toLowerCase();
    return (customer.name && customer.name.toLowerCase().includes(lowerQuery)) ||
           (customer.email && customer.email.toLowerCase().includes(lowerQuery));
  });

  const handleCustomerSelect = (customer) => {
    navigation.navigate('CustomerDetail', { customerId: customer.id, customerName: customer.name });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0055cc" />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Customer Database</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={({item}) => (
          <TouchableOpacity 
            style={styles.customerItem}
            onPress={() => handleCustomerSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <Text style={styles.customerName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={filteredCustomers.length === 0 && styles.emptyListContainer}
        ListEmptyComponent={<Text style={styles.emptyListText}>No customers found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    backgroundColor: '#007aff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  customerName: {
    fontSize: 16,
    color: '#000',
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: '#999',
  },
});

export default CustomerDatabaseScreen;
