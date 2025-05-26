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
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const ClientStaffChatScreen = ({ route, navigation }) => {
  const { conversationId, recipientId, userId } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [recipientName, setRecipientName] = useState('Sales Support');
  const [recipientBotName, setRecipientBotName] = useState('Bot');
  const flatListRef = useRef(null);

  useEffect(() => {
    // Fetch recipient name dynamically based on conversation
    const fetchRecipientName = async () => {
      if (!conversationId || !recipientId) return;
      try {
        // Assuming conversation document has participant IDs
        const conversationDocRef = doc(db, 'escalations', recipientId);
        const conversationDocSnap = await getDoc(conversationDocRef);
        if (conversationDocSnap.exists()) {
          const data = conversationDocSnap.data();
          // Find the other participant's ID
          const participants = data.participants || [];
          const otherParticipantId = participants.find(id => id !== recipientId);
          if (otherParticipantId) {
            const userDocRef = doc(db, 'staff', otherParticipantId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              setRecipientName(userData.name || 'Sales Support');
            } else {
              setRecipientName('Sales Support');
            }
          } else {
            setRecipientName('Sales Support');
          }
        } else {
          setRecipientName('Sales Support');
        }
      } catch (error) {
        console.error('Error fetching recipient name:', error);
        setRecipientName('Sales Support');
      }
    };
    fetchRecipientName();
  }, [conversationId, recipientId]);

  useEffect(() => {
    if (!recipientId) return;

    // Listen to Firestore document that contains messages array
    const docRef = doc(db, 'escalations', recipientId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const msgs = data.messages || [];
        // Normalize timestamps to Date objects for sorting
        msgs.forEach(msg => {
          if (msg.timestamp && msg.timestamp.toDate && typeof msg.timestamp.toDate === 'function') {
            msg.timestamp = msg.timestamp.toDate();
          } else if (typeof msg.timestamp === 'number') {
            msg.timestamp = new Date(msg.timestamp);
          } else if (!(msg.timestamp instanceof Date)) {
            msg.timestamp = new Date(msg.timestamp);
          }
        });
        // Sort messages by timestamp ascending
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [recipientId]);

  const sendMessage = async () => {
    if (!messageText.trim() || !recipientId) return;

    try {
      // Add message to Firestore under 'escalations/{recipientId}' document's messages array
      const escalationDocRef = doc(db, 'escalations', recipientId);
      const escalationDocSnap = await getDoc(escalationDocRef);
      if (escalationDocSnap.exists()) {
        const data = escalationDocSnap.data();
        const messagesArray = data.messages || [];
        const newMessage = {
          id: Date.now().toString(),
          text: messageText,
          sender: 'user',
          timestamp: new Date(),
        };
        messagesArray.push(newMessage);
        await setDoc(escalationDocRef, { messages: messagesArray }, { merge: true });
      } else {
        // If document doesn't exist, create it with messages array
        await setDoc(escalationDocRef, {
          messages: [{
            id: Date.now().toString(),
            text: messageText,
            sender: 'user',
            timestamp: new Date(),
          }],
        });
      }

      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessageItem = ({ item }) => {
    let senderName = 'Staff';
    let messageStyle = styles.staffMessage;
    if (item.sender === 'user') {
      senderName = 'You';
      messageStyle = styles.userMessage;
    } else if (item.sender === 'bot') {
      senderName = 'Bot';
      messageStyle = styles.botMessage;
    } else if (item.sender === 'staff') {
      senderName = recipientBotName || 'Staff';
      messageStyle = styles.staffMessage;
    }
    let messageDate = null;
    if (item.timestamp) {
      if (item.timestamp.toDate && typeof item.timestamp.toDate === 'function') {
        messageDate = item.timestamp.toDate();
      } else if (typeof item.timestamp === 'number') {
        messageDate = new Date(item.timestamp);
      } else {
        messageDate = new Date(item.timestamp);
      }
    }
    const timeString = messageDate ? messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <View
        style={[
          styles.message,
          messageStyle,
        ]}
      >
        <Text style={styles.senderName}>{senderName}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>{timeString}</Text>
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
              <Text style={styles.botIconText}>{recipientName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.botName}>{recipientName}</Text>
          </View>
          <TouchableOpacity onPress={() => {}} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
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
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="camera" size={24} color="#666" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Message..."
              placeholderTextColor="#666"
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <View style={styles.rightIcons}>
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
                disabled={!messageText.trim()}
                style={styles.sendButton}
              >
                <Ionicons
                  name="send"
                  size={28}
                  color={!messageText.trim() ? '#aaa' : '#007AFF'}
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
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffe4b5',
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

export default ClientStaffChatScreen;
