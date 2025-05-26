import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// Removed Ionicons import since we will use only FontAwesome
import FontAwesome from 'react-native-vector-icons/FontAwesome';
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
            iconName = 'comments'; // FontAwesome equivalent of chatbubbles
          } else if (route.name === 'Schedule') {
            iconName =  'home';
          } else if (route.name === 'Customers') {
            iconName = 'users'; // FontAwesome equivalent of people
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return <FontAwesome name={iconName} size={size} color={color} />;
        
        },
        tabBarActiveTintColor: '#0055cc',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={ScheduleScreen} options={{ title: 'Schedule' }} />
      <Tab.Screen name="EscalatedChats" component={EscalatedChatsScreen} options={{ title: 'Escalated Chats' }} />
      <Tab.Screen name="Customers" component={CustomerDatabaseScreen} options={{ title: 'Customer Database' }} />
      <Tab.Screen name="Profile" component={StaffProfile} options={{ title: 'Profile' }} />

    </Tab.Navigator>
  );
};

export default StaffHomeScreen;
