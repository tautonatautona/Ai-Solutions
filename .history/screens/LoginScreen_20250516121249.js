import React, { useState } from 'react';
import { ScrollView, View, TextInput, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth, db, getUserRole } from './firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setError('');
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        return getDoc(doc(db, 'users', user.uid));
      })
      .then((docSnap) => {
        setLoading(false);
        if (docSnap.exists()) {
          const role = docSnap.data().role;
      if (role === 'admin') {
        navigation.getParent().reset({
          index: 0,
          routes: [{ name: 'Admin' }],
        });
      } else if (role === 'staff') {
        navigation.getParent().reset({
          index: 0,
          routes: [{ name: 'Staff' }],
        });
      } else {
        navigation.getParent().reset({
          index: 0,
          routes: [{ name: 'Client' }],
        });
      }
        } else {
          setError('User data not found.');
        }
      })
      .catch((error) => {
        setLoading(false);
        setError(error.message);
      });
  };

  return (
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Text style={styles.titleHeader}>Login here</Text>
        <Text style={styles.welcomeText}>Welcome back you've been missed!</Text>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={24} color="#2851C8" style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.inputWithIcon}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={24} color="#2851C8" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.inputWithIcon}
              editable={!loading}
            />
          </View>
          
          {/* <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} disabled={loading}>
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity> */}
          
          {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
          
          {loading ? (
            <ActivityIndicator size="large" color="#2851C8" style={styles.loading} />
          ) : (
            <TouchableOpacity
              onPress={handleLogin}
              disabled={!email || !password || loading}
            >
              <LinearGradient
                colors={['#2851C8', '#1E3C72']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInButton}
              >
                <Text style={styles.signInButtonText}>Sign in</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading}>
            <Text style={styles.createAccountText}>Create new account</Text>
          </TouchableOpacity>
          
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.divider} />
          </View>
          
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <Icon name="logo-google" size={28} color="#DB4437" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Icon name="logo-facebook" size={28} color="#4267B2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Icon name="logo-apple" size={28} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
  
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleHeader: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2851C8',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 50,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8EBF7',
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 60,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 16,
  },
  forgotPasswordText: {
    color: '#2851C8',
    textAlign: 'right',
    fontSize: 16,
    marginBottom: 30,
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  signInButton: {
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  signInButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  createAccountText: {
    color: '#444',
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 40,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8EBF7',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#666',
    fontSize: 16,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F5F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E8EBF7',
  },
  socialButtonText: {
    fontSize: 24,
  },
  loading: {
    marginVertical: 20,
  },
});

export default LoginScreen;
