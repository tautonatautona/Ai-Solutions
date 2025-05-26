import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const CustomerDetailScreen = ({ route, navigation }) => {
  const { customerId, customerName } = route.params;
  const [customerInfo, setCustomerInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    const fetchCustomerInfo = async () => {
      try {
        const docRef = doc(db, 'clients', customerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCustomerInfo(docSnap.data());
        } else {
          Alert.alert('Error', 'Customer not found');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch customer info: ' + error.message);
      }
    };

    fetchCustomerInfo();
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;

    const messagesQuery = query(
      collection(db, 'clients', customerId, 'chatHistory'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          text: data.text || '',
          sender: data.sender || 'unknown',
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        });
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [customerId]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, 'clients', customerId, 'chatHistory'), {
        text: inputText.trim(),
        sender: 'staff',
        createdAt: serverTimestamp(),
      });
      setInputText('');
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      Alert.alert('Error sending message:', error.message);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isStaff = item.sender === 'staff';
    const senderName = isStaff ? 'Staff' : 'Client';
    return (
      <View
        style={[
          styles.message,
          isStaff ? styles.staffMessage : styles.userMessage,
        ]}
      >
        <Text style={styles.senderName}>{senderName}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{customerName || 'Customer Detail'}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductRecommendation', { customerId, customerName })}
            style={styles.recommendButton}
          >
            <Ionicons name="pricetag-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {customerInfo && (
          <View style={styles.customerInfo}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoText}>{customerInfo.email || 'N/A'}</Text>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoText}>{customerInfo.phone || 'N/A'}</Text>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoText}>{customerInfo.address || 'N/A'}</Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          
        />

        {/* <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor="#666"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim()}
            style={styles.sendButton}
          >
            <Ionicons
              name="send"
              size={28}
              color={!inputText.trim() ? '#aaa' : '#007AFF'}
            />
          </TouchableOpacity>
        </View> */}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  recommendButton: {
    padding: 5,
  },
  customerInfo: {
    padding: 15,
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#003366',
    marginTop: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#222',
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  message: {
    padding: 10,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 15,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  staffMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#cce5ff',
  },
  messageText: {
    fontSize: 16,
    color: '#222',
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#555',
    fontSize: 14,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 25,
    marginHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#000',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default CustomerDetailScreen;
