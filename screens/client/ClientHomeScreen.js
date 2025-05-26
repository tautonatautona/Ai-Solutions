import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ChatbotScreen from './ChatbotScreen';
import EventsScreen from './EventsScreen';
import UserProfile from './UserProfileScreen'; 
import InboxScreen from './InboxScreen';
import RemindersScreen from './RemindersScreen';

import FontAwesome from 'react-native-vector-icons/FontAwesome';

const Tab = createBottomTabNavigator();

const ClientHomeScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Inbox') {
            iconName = 'envelope';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          } else if (route.name === 'Reminders') {
            iconName = 'bell';
          }

          return <FontAwesome name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4285F4',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={EventsScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
      <Tab.Screen name="Reminders" component={RemindersScreen} options={{ title: 'Reminders' }} />
      <Tab.Screen name="Profile" component={UserProfile} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

export default ClientHomeScreen;
