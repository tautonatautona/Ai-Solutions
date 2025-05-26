import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
      
      <TextInput
        style={styles.searchInput}
        placeholder="Search customers..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
        autoCorrect={false}
        autoCapitalize="none"
      />

      <FlatList
        data={filteredCustomers}
        renderItem={({item}) => (
          <TouchableOpacity 
            style={styles.customerItem}
            onPress={() => handleCustomerSelect(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.customerName}>{item.name}</Text>
            <Text style={styles.customerEmail}>{item.email}</Text>
            <Text style={styles.lastChat}>Last contact: {item.lastChat || 'N/A'}</Text>
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
    padding: 20,
    backgroundColor: '#f0f4ff',
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
    color: '#003d99',
  },
  searchInput: {
    height: 45,
    borderColor: '#0055cc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#000',
    fontSize: 16,
  },
  customerItem: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#0055cc',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  customerName: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 6,
    color: '#003d99',
  },
  customerEmail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  lastChat: {
    fontSize: 12,
    color: '#888',
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
