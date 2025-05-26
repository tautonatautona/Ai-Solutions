import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import EscalatedChatsScreen from './EscalatedChatsInboxScreen';
import ScheduleScreen from './ScheduleScreen';
import CustomerDatabaseScreen from './CustomerDatabaseScreen';
import CustomerDetailScreen from './CustomerDetailScreen';
import ProductRecommendationScreen from './ProductRecommendationScreen';
import SettingsScreen from './SettingsScreen'; 

const Tab = createBottomTabNavigator();

const StaffHomeScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'EscalatedChats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Customers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0055cc',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Schedule' }} />
      <Tab.Screen name="EscalatedChats" component={EscalatedChatsScreen} options={{ title: 'Escalated Chats' }} />
      <Tab.Screen name="Customers" component={CustomerDatabaseScreen} options={{ title: 'Customer Database' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />

    </Tab.Navigator>
  );
};

export default StaffHomeScreen;
