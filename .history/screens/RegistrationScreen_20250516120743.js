import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const RegistrationScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to determine role based on email
  const determineRole = (email) => {
    if (!email || typeof email !== 'string') return 'client';
    if (email.indexOf('admin') !== -1) return 'admin';
    if (email.indexOf('staff') !== -1) return 'staff';
    return 'client';
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const role = determineRole(email);

      // Store role in Firestore for all users including clients
      await setDoc(doc(db, 'users', user.uid), { role: role });

      // After successful registration
      if (role === 'client') {
        navigation.navigate('ClientInfo', { userId: user.uid });
      } else {
        navigation.navigate('Login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Account</Text>
      
      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6B7280"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#6B7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#6B7280"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!loading}
      />
      
      {loading ? (
        <ActivityIndicator size="large" color="#1E40AF" style={styles.loading} />
      ) : (
        <TouchableOpacity
          style={[styles.button, (!email || !password || !confirmPassword || password !== confirmPassword) && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={!email || !password || !confirmPassword || password !== confirmPassword || loading}
        >
          <Text style={styles.buttonText}>Sign up</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRedirect}>
        <Text style={styles.loginRedirectText}>Already have an account</Text>
      </TouchableOpacity>

      <Text style={styles.orContinueText}>Or continue with</Text>

      <View style={styles.socialButtonsContainer}>
        <TouchableOpacity style={styles.socialButton}>
          <Image source={require('../assets/google.png')} style={styles.socialIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Image source={require('../assets/facebook.png')} style={styles.socialIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Image source={require('../assets/apple.png')} style={styles.socialIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#1E40AF',
  },
  input: {
    height: 50,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#1E40AF',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#1E40AF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#a0c1f7',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  loading: {
    marginVertical: 15,
  },
  loginRedirect: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  loginRedirectText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 14,
  },
  orContinueText: {
    textAlign: 'center',
    color: '#1E40AF',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 50,
  },
  socialButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    width: 60,
    height: 60,
  },
  socialIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});

export default RegistrationScreen;
