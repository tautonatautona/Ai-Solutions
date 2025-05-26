import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const EscalatedChatsInboxScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [escalatedChats, setEscalatedChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'escalations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chats = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          clientName: data.clientName || data.userName || 'Unknown',
          title: data.title || '',
          lastMessage: data.lastMessage || '',
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        });
      });
      setEscalatedChats(chats);
      setFilteredChats(chats);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!searchText) {
      setFilteredChats(escalatedChats);
    } else {
      const lowerSearch = searchText.toLowerCase();
      const filtered = escalatedChats.filter(chat =>
        chat.clientName.toLowerCase().includes(lowerSearch) ||
        chat.lastMessage.toLowerCase().includes(lowerSearch)
      );
      setFilteredChats(filtered);
    }
  }, [searchText, escalatedChats]);

  const renderChatItem = ({ item }) => {
    const initials = item.clientName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
<TouchableOpacity
  style={styles.chatItem}
  onPress={() => navigation.navigate('EscalatedChatDetail', { chatId: item.id, customerId: item.id, customerName: item.clientName, userId: item.id })}
>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
        <Text style={styles.timestamp}>now</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Escalate messages</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search"
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={setSearchText}
      />
      <Text style={styles.subHeading}>Messages</Text>
      <FlatList
        data={filteredChats}
        keyExtractor={item => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingTop: 20,
    marginLeft: 70,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  subHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  chatItem: {
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
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  chatInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
});

export default EscalatedChatsInboxScreen;
