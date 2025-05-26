import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const ClientInfoScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    country: ''
  });
  const [loading, setLoading] = useState(false);

  // Fetch existing data if available
  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, 'clients', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFormData(docSnap.data());
      }
    };
    fetchData();
  }, [userId]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await setDoc(doc(db, 'clients', userId), {
        ...formData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      navigation.navigate('ClientHome');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Complete Your Profile</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={formData.name}
        onChangeText={text => setFormData({...formData, name: text})}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={formData.email}
        onChangeText={text => setFormData({...formData, email: text})}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={formData.phone}
        onChangeText={text => setFormData({...formData, phone: text})}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Company Name"
        value={formData.company}
        onChangeText={text => setFormData({...formData, company: text})}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Country"
        value={formData.country}
        onChangeText={text => setFormData({...formData, country: text})}
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleSubmit}
        disabled={!formData.name || !formData.email || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default ClientInfoScreen;
