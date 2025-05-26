import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const InboxScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');

  const fetchRecipientName = async (userId) => {
    try {
      const userDocRef = doc(db, 'clients', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return data.name || 'Unknown';
      }
      return 'Unknown';
    } catch (error) {
      console.error('Error fetching recipient name:', error);
      return 'Unknown';
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not logged in');
        setLoading(false);
        return;
      }
      const userId = user.uid;

      // Get the chatMessages document for this user
      const docRef = doc(db, 'chatMessages', userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const data = docSnap.data();
      const messages = data.messages || [];

      // Group messages by conversationId and get latest message per conversation
      // Also store last two messages' senders per conversation
      const convMap = new Map();
      const convMessagesMap = new Map(); // to store all messages per conversation

      for (const message of messages) {
        const convId = message.conversationId || 'unknown';

        // Store messages per conversation for last two messages check
        if (!convMessagesMap.has(convId)) {
          convMessagesMap.set(convId, []);
        }
        convMessagesMap.get(convId).push(message);

        // Determine type based on sender id
        let type = 'Human';
        if (message.sender === 'bot') {
          type = 'AI';
        } else if (message.sender === 'staff') {
          type = 'Human';
        } else if (message.sender) {
          if (typeof message.sender === 'string' && message.sender.toLowerCase().includes('bot')) {
            type = 'AI';
          }
        }

        if (!convMap.has(convId)) {
          convMap.set(convId, {
            id: convId,
            preview: message.text || '',
            type,
            lastSender: message.sender || null,
            date: message.timestamp ? message.timestamp.toDate() : new Date(),
            recipientId: message.recipientId || null,
          });
        } else {
          const existing = convMap.get(convId);
          const currentDate = message.timestamp ? message.timestamp.toDate() : new Date();
          if (currentDate > existing.date) {
            convMap.set(convId, {
              id: convId,
              preview: message.text || '',
              type,
              lastSender: message.sender || null,
              date: currentDate,
              recipientId: message.recipientId || null,
            });
          }
        }
      }

      // Sort messages per conversation by timestamp descending to get last two messages
      const convArray = Array.from(convMap.values()).sort((a, b) => b.date - a.date);

      const convArrayWithNames = await Promise.all(
        convArray.map(async (conv) => {
          let recipientName = 'Bot';
          if (conv.lastSender === 'staff') {
            recipientName = 'Sales Support';
          } else if (conv.recipientId) {
            const name = await fetchRecipientName(conv.recipientId);
            recipientName = name;
          }
          // Add lastTwoSenders array to conv object for later use
          const allMessages = convMessagesMap.get(conv.id) || [];
          allMessages.sort((a, b) => {
            const aDate = a.timestamp ? a.timestamp.toDate() : new Date(0);
            const bDate = b.timestamp ? b.timestamp.toDate() : new Date(0);
            return bDate - aDate;
          });
          const lastTwoSenders = allMessages.slice(0, 2).map(msg => msg.sender);
          return { ...conv, recipientName, lastTwoSenders };
        })
      );

      setConversations(convArrayWithNames);
    } catch (err) {
      setError('Failed to load conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setLoading(true);
    await fetchConversations();
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.recipientName.toLowerCase().includes(searchText.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0055cc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No conversations found.</Text>
      </View>
    );
  }

  const handleConversationPress = (conversationId, recipientId) => {
    // Find the conversation object to check last two messages' senders
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation && conversation.lastTwoSenders) {
      const lastTwo = conversation.lastTwoSenders;
      if (lastTwo.length === 2) {
        if (lastTwo.includes('bot') && (lastTwo.includes('user') || lastTwo.includes('staff'))) {
          navigation.navigate('Chatbot', { conversationId });
          return;
        } else if (lastTwo[0] === 'staff' && lastTwo[1] === 'staff') {
          navigation.navigate('ClientStaffChatScreen', { conversationId, recipientId });
          return;
        }
      }
    }
    // If condition not met, do not navigate or handle differently
    // For now, do nothing or optionally navigate to a default screen
    // Here, we do nothing
  };

  const renderItem = ({ item }) => {
    const initials = item.recipientName
      .split(' ')
      .map(namePart => namePart.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);

    const previewText = item.preview.length > 20 ? item.preview.substring(0, 20) + '…' : item.preview;

    let timeString = '';
    if (item.date) {
      const now = new Date();
      const diffMs = now - item.date;
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        timeString = 'now';
      } else if (diffMinutes < 60) {
        timeString = diffMinutes + 'm ago';
      } else if (diffHours < 24) {
        timeString = diffHours + 'h ago';
      } else if (diffDays < 7) {
        timeString = diffDays + 'd ago';
      } else {
        timeString = item.date.toLocaleDateString();
      }
    } else {
      timeString = '';
    }

    return (
      <TouchableOpacity style={styles.messageItem} onPress={() => handleConversationPress(item.id, item.recipientId)} activeOpacity={0.7}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.messageTextContainer}>
          <Text style={styles.recipientName}>{item.recipientName}</Text>
          <Text style={styles.previewText}>{previewText}</Text>
        </View>
        <Text style={styles.timeText}>{timeString}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search"
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={setSearchText}
      />
      <Text style={styles.messagesHeading}>Messages</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
    color: '#000',
  },
  messagesHeading: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 15,
    color: '#000',
  },
  remindersHeading: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 10,
    color: '#d35400',
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  avatar: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  messageTextContainer: {
    flex: 1,
  },
  recipientName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#000',
  },
  previewText: {
    color: '#666',
    marginTop: 2,
    fontSize: 14,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 10,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#f5cba7',
    borderBottomWidth: 1,
  },
  reminderIcon: {
    marginRight: 15,
  },
  reminderIconText: {
    fontSize: 20,
    color: '#d35400',
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#d35400',
  },
  reminderDescription: {
    color: '#a04000',
    marginTop: 2,
    fontSize: 14,
  },
  reminderTime: {
    color: '#a04000',
    fontSize: 12,
    marginLeft: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InboxScreen;
