import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const parseTimestamp = (timestamp) => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (typeof timestamp === 'string') return new Date(timestamp);
  return new Date();
};

const EscalatedChatDetailScreen = ({ route, navigation }) => {
  const { chatId, customerId, customerName, userId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [recipientName, setRecipientName] = useState(customerName || 'Client');
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      console.log('No userId provided in route params');
      return;
    }
    console.log('Listening to escalations document for userId:', userId);

    const docRef = doc(db, 'escalations', userId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log('Escalations document exists for userId:', userId);
        const data = docSnap.data();
        console.log('Escalations doc data:', data);
        const msgs = Array.isArray(data.messages) ? data.messages.map((msg, index) => ({
          id: msg.id || index.toString(),
          text: msg.text || '',
          sender: msg.sender || 'unknown',
          recipient: msg.recipient || 'unknown',
          createdAt: parseTimestamp(msg.createdAt),
        })) : [];
        console.log('Parsed messages:', msgs);
        setMessages(msgs);
      } else {
        console.log('No escalations document found for userId:', userId);
        setMessages([]);
      }
    }, (error) => {
      console.error('Error in onSnapshot:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchCustomerInfo = async () => {
      if (!customerId) return;
      try {
        const docRef = doc(db, 'clients', customerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCustomerInfo(docSnap.data());
        }
      } catch (error) {
        console.error('Failed to fetch customer info:', error);
      }
    };
    fetchCustomerInfo();
  }, [customerId]);

  useEffect(() => {
    const fetchRecipientName = async () => {
      if (!chatId || !userId) return;
      try {
        const docRef = doc(db, 'staff', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRecipientName(data.name || 'Staff');
        }
      } catch (error) {
        console.error('Failed to fetch recipient name:', error);
      }
    };
    fetchRecipientName();
  }, [chatId, userId]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const docRef = doc(db, 'escalations', userId);
      await updateDoc(docRef, {
        messages: arrayUnion({
          id: Date.now().toString(),
          text: inputText.trim(),
          sender: 'staff',
          recipient: customerId,
          createdAt: new Date(),
        }),
      });
      setInputText('');
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessageItem = ({ item }) => {
    let senderName = 'Client';
    let messageStyle = styles.userMessage;
    if (item.sender === 'staff') {
      senderName = 'Staff';
      messageStyle = styles.staffMessage;
    } else if (item.sender === 'bot') {
      senderName = 'Bot';
      messageStyle = styles.userMessage;
    } else if (item.sender === 'client') {
      senderName = 'Client';
      messageStyle = styles.userMessage;
    }
    return (
      <View
        style={[
          styles.message,
          messageStyle,
        ]}
      >
        <Text style={styles.senderName}>{senderName}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {item.createdAt instanceof Date && !isNaN(item.createdAt)
            ? item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.botInfo}>
            <View style={styles.botIcon}>
              <Text style={styles.botIconText}>S</Text>
            </View>
            <Text style={styles.botName}>{customerName || 'Client'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('CustomerDetail', { customerId })} style={styles.infoButton}>
            <Ionicons name="person-circle-outline" size={24} color="#000" />
          </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ProductRecommendation', { customerId, customerName })} style={styles.infoButton}>
          <Ionicons name="pricetag-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>No messages yet. Start a conversation!</Text>
            </View>
          }
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              placeholderTextColor="#666"
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <View style={styles.rightIcons}>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="camera" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="mic" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="image" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="happy-outline" size={24} color="#666" />
              </TouchableOpacity>
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
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  botIconText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  botName: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoButton: {
    padding: 5,
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#fff',
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
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
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

export default EscalatedChatDetailScreen;
