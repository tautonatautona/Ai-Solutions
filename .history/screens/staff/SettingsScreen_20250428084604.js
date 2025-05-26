import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Linking, Platform } from 'react-native';
import { auth } from './../firebaseConfig';

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Logout Error', error.message);
    }
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change functionality is not implemented yet.');
  };

  const handleToggleNotifications = () => {
    setNotificationsEnabled(previousState => !previousState);
    Alert.alert('Notifications', `Notifications ${!notificationsEnabled ? 'enabled' : 'disabled'}.`);
  };

  const handleToggleDarkMode = () => {
    setDarkModeEnabled(previousState => !previousState);
    Alert.alert('Theme', `Dark mode ${!darkModeEnabled ? 'enabled' : 'disabled'}.`);
  };

  const openLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open link.');
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StaffInfo')} activeOpacity={0.8}>
        <Text style={styles.cardText}>Update Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={handleChangePassword} activeOpacity={0.8}>
        <Text style={styles.cardText}>Change Password</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#ccc', true: '#4cd137' }}
            thumbColor={Platform.OS === 'android' ? (notificationsEnabled ? '#27ae60' : '#f4f3f4') : undefined}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Dark Mode</Text>
          <Switch
            value={darkModeEnabled}
            onValueChange={handleToggleDarkMode}
            trackColor={{ false: '#ccc', true: '#4cd137' }}
            thumbColor={Platform.OS === 'android' ? (darkModeEnabled ? '#27ae60' : '#f4f3f4') : undefined}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.link} onPress={() => openLink('https://example.com/privacy')}>
        <Text style={styles.linkText}>Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => openLink('https://example.com/terms')}>
        <Text style={styles.linkText}>Terms of Service</Text>
      </TouchableOpacity>

      <View style={styles.aboutContainer}>
        <Text style={styles.aboutTitle}>About This App</Text>
        <Text style={styles.aboutText}>Version 1.0.0</Text>
        <Text style={styles.aboutText}>© 2025 Your Company</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 30,
    color: '#2c3e50',
  },
  card: {
    backgroundColor: 'white',
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 18,
    color: '#34495e',
  },
  link: {
    marginBottom: 15,
  },
  linkText: {
    color: '#2980b9',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  aboutContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  aboutTitle: {
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 8,
    color: '#2c3e50',
  },
  aboutText: {
    fontSize: 15,
    color: '#7f8c8d',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 12,
    marginTop: 50,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 7,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 20,
  },
});

export default SettingsScreen;
