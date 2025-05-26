import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './screens/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// Import screens from organized folders
import LoginScreen from './screens/LoginScreen';
import RegistrationScreen from './screens/RegistrationScreen';

// Client screens
import ClientHomeScreen from './screens/client/ClientHomeScreen';
import ClientInfoScreen from './screens/client/ClientInfoScreen';
import EventsScreen from './screens/client/EventsScreen';
import EventDetailScreen from './screens/client/EventDetailScreen';
import InboxScreen from './screens/client/InboxScreen';
import ProfileScreen from './screens/client/UserProfileScreen';
import FeedbackScreen from './screens/client/FeedbackScreen';

// Staff screens
import StaffHomeScreen from './screens/staff/StaffHomeScreen';
import EscalatedChatsScreen from './screens/staff/EscalatedChatsInboxScreen';
import ScheduleScreen from './screens/staff/ScheduleScreen';
import CustomerDatabaseScreen from './screens/staff/CustomerDatabaseScreen';
import EscalatedChatDetailScreen from './screens/staff/EscalatedChatDetailScreen';
import AddEventScreen from './screens/staff/AddEventScreen';
import CustomerDetailScreen from './screens/staff/CustomerDetailScreen';
import ProductRecommendationScreen from './screens/staff/ProductRecommendationScreen';
import EventPreviewScreen from './screens/staff/EventPreviewScreen';
import StaffProfile from './screens/staff/StaffProfileScreen'; // Assuming this is the settings screen

// Admin screens
import AdminHomeScreen from './screens/admin/AdminHomeScreen';
import UserManagementScreen from './screens/admin/UserManagementScreen';
import AnalyticsScreen from './screens/admin/AnalyticsScreen';
import BackupScreen from './screens/admin/BackupScreen';
import ChatbotScreen from './screens/client/ChatbotScreen';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const ClientStack = createNativeStackNavigator();
const StaffStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

function AuthStackScreen() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={RegistrationScreen} options={{ headerShown: false  }} />
    </AuthStack.Navigator>
  );
}

import ClientStaffChatScreen from './screens/client/ClientStaffChatScreen';
import SplashScreen from './screens/SplashScreen';

function ClientStackScreen() {
  return (
    <ClientStack.Navigator>
      <ClientStack.Screen name="ClientHome" component={ClientHomeScreen} options={{ headerShown: false }} />
      <ClientStack.Screen name="Chatbot" component={ChatbotScreen} options={{ headerShown: false }} />
      <ClientStack.Screen name="ClientStaffChatScreen" component={ClientStaffChatScreen} options={{ headerShown: false }} />
      <ClientStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Detail' }} />
      <ClientStack.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
      <ClientStack.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
      <ClientStack.Screen name="ClientInfo" component={ClientInfoScreen} options={{ title: 'Client Info' }} />
      <ClientStack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ClientStack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback' }} />
    </ClientStack.Navigator>
  );
}


function StaffStackScreen() {
  return (
    <StaffStack.Navigator>
      <StaffStack.Screen name="StaffHome" component={StaffHomeScreen} options={{ headerShown: false }} />
      <StaffStack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Schedule Events' }} />
      <StaffStack.Screen name="EscalatedChats" component={EscalatedChatsScreen} options={{ title: 'Escalated Chats' }} />
      <StaffStack.Screen name="Customers" component={CustomerDatabaseScreen} options={{ title: 'Customer Database' }} />
      <StaffStack.Screen name="EscalatedChatDetail" component={EscalatedChatDetailScreen} options={{ headerShown: false }} />
      <StaffStack.Screen name="AddEvent" component={AddEventScreen} options={{ title: 'Add Event' }} />
      <StaffStack.Screen name="EventPreview" component={EventPreviewScreen} options={{ title: 'Edit Event' }} />
      <StaffStack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer Detail' }} />
      <StaffStack.Screen name="ProductRecommendation" component={ProductRecommendationScreen} options={{ title: 'Product Recommendation' }} />
      <StaffStack.Screen name="StaffProfile" component={StaffProfile} options={{ title: 'Profle' }} />
    </StaffStack.Navigator>
  );
}

function AdminStackScreen() {
  return (
    <AdminStack.Navigator>
      <AdminStack.Screen name="AdminHome" component={AdminHomeScreen} options={{ headerShown: false }} />
      <AdminStack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Manage Users' }} />
      <AdminStack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'System Analytics' }} />
      <AdminStack.Screen name="Backup" component={BackupScreen} options={{ title: 'Backup & Restore' }} />
    </AdminStack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minimumSplashTimeElapsed, setMinimumSplashTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumSplashTimeElapsed(true);
    }, 4000); // Minimum splash screen display time in milliseconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          } else {
            setRole(null);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading || !minimumSplashTimeElapsed) {
    // You can render a splash screen or loading indicator here
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <RootStack.Screen name="Auth" component={AuthStackScreen} />
        ) : role === 'admin' ? (
          <RootStack.Screen name="Admin" component={AdminStackScreen} />
        ) : role === 'staff' ? (
          <RootStack.Screen name="Staff" component={StaffStackScreen} />
        ) : (
          <RootStack.Screen name="Client" component={ClientStackScreen} />
        )}
      </RootStack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
