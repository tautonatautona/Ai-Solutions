import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import EscalatedChatsScreen from './EscalatedChatsInboxScreen';
import ScheduleScreen from './ScheduleScreen';
import CustomerDatabaseScreen from './CustomerDatabaseScreen';
import CustomerDetailScreen from './CustomerDetailScreen';
import ProductRecommendationScreen from './ProductRecommendationScreen';
import StaffProfile from './StaffProfileScreen'; 

const Tab = createBottomTabNavigator();

const StaffHomeScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'EscalatedChats') {
            iconName = 'chatbubbles';
          } else if (route.name === 'Schedule') {
            iconName =  'home';
          } else if (route.name === 'Customers') {
            iconName = 'people'
          } else if (route.name === 'Profile') {
            iconName = 'user';
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
      <Tab.Screen name="StaffProfile" component={SettingsScreen} options={{ title: 'Profile' }} />

    </Tab.Navigator>
  );
};

export default StaffHomeScreen;
