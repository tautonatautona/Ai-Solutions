import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import UserManagementScreen from './UserManagementScreen';
import AnalyticsScreen from './AnalyticsScreen';
import BackupScreen from './BackupScreen';
import SettingsScreen from './SettingsScreen';
import UserDetailScreen from './UserDetailScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const AdminHomeScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Users') {
            iconName = 'group';
          } else if (route.name === 'Analytics') {
            iconName = 'analytics';
          } else if (route.name === 'Backup') {
            iconName = 'backup';
          } else if (route.name === 'Settings') {
            iconName = 'account-circle';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Users" component={UserManagementScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Backup" component={BackupScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default AdminHomeScreen;
