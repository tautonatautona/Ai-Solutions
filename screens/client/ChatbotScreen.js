import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { db, rtdb, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, query, where, orderBy, arrayUnion } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

// Configuration constants
const BOT_ID = '39199b9a-b5bb-4abb-b484-5f0fed484382';
const WEBHOOK_URL = 'a722370b-c077-4eb1-894b-a2439aba17f1';
const BOTPRESS_WEBHOOK_BASE_URL = `https://chat.botpress.cloud/${WEBHOOK_URL}`;
const BOTPRESS_API_TOKEN = 'bp_pat_ehm9MDtz8HD1hhJEKk4BC41bqD484mF9nFCl';
const WORKSPACE_ID = 'wkspace_01JS2NF005NCYQ6PTNV6C7ZQPG';
const ESCALATION_CONFIDENCE_THRESHOLD = 0.6;

export const sendMessageToBotpress = async (userId, message) => {
  try {
    console.log(`Sending message to Botpress: userId=${userId}, message=${message}`);
    const response = await fetch(`https://cdn.botpress.cloud/webchat/${BOT_ID}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`
      },
      body: JSON.stringify({
        userId: userId,
        payload: {
          type: 'text',
          text: message,
        }
      })
    });

    console.log('Received response status:', response.status);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const jsonResponse = await response.json();
    console.log('Response JSON:', jsonResponse);
    return jsonResponse;
  } catch (error) {
    console.error('Error sending message to Botpress:', error);
    throw error;
  }
};

const ChatbotScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('Tautona');
  const [userKey, setUserKey] = useState(null);
  // Use conversationId from route params if provided, else state
  const [currentConversationId, setCurrentConversationId] = useState(route?.params?.conversationId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const flatListRef = useRef(null);
  const initializationInProgress = useRef(false);
  const debounceTimeout = useRef(null);
  const saveIntervalRef = useRef(null);

  const fetchMessages = async () => {
    if (!userKey || !currentConversationId) {
      console.warn('Cannot fetch messages: missing userKey or currentConversationId');
      return;
    }
    const url = `${BOTPRESS_WEBHOOK_BASE_URL}/conversations/${currentConversationId}/messages`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-user-key': userKey,
      }
    };

    try {
      const res = await fetch(url, options);
      const json = await res.json();
      console.log(json);
      if (json && json.messages && json.messages.length > 0) {
        const sortedMessages = json.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const mappedMessages = sortedMessages.map(msg => {
          const text = msg.payload?.text;
          if (typeof text === 'string' && text.trim() !== '') {
            return {
              id: msg.id || msg.createdAt,
              text: text.trim(),
              sender: msg.userId === userId ? 'user' : 'bot',
              timestamp: new Date(msg.createdAt)
            };
          }
          return null;
        }).filter(m => m !== null);
      console.log('Fetched messages from Botpress API:', mappedMessages);

        setMessages(prevMessages => {
          const combined = [...prevMessages];
          mappedMessages.forEach(newMsg => {
            if (!combined.find(m => m.id === newMsg.id)) {
              combined.push(newMsg);
              // Store new bot messages in Firestore
              if (newMsg.sender === 'bot') {
                storeMessage(newMsg.text, 'bot').catch(error => {
                  console.error('Error storing bot message from fetchMessages:', error);
                });
              }
            }
          });
          combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          console.log('Combined messages after Botpress fetch:', combined);
          return combined;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

const loadMessagesFromFirestore = async () => {
    if (!userId || !currentConversationId) {
      console.warn('Cannot load messages from Firestore: missing userId or currentConversationId');
      return;
    }
    try {
      const docRef = doc(db, 'chatMessages', currentConversationId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const allMessages = data.messages || [];
        allMessages.sort((a, b) => new Date(a.timestamp.seconds * 1000) - new Date(b.timestamp.seconds * 1000));
        console.log('Loaded messages from Firestore document:', allMessages);
        setMessages(allMessages);
      } else {
        console.log('No chatMessages document found for conversationId:', currentConversationId);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages from Firestore:', error);
    }
  };

  useEffect(() => {
    if (!userKey || !currentConversationId) {
      return;
    }
    if (!isInitialized) {
      loadMessagesFromFirestore();
    }

    const fetchInterval = setInterval(() => {
      fetchMessages();
    }, 3000);

    fetchMessages();

    // Set up interval to save messages every minute
    if (!saveIntervalRef.current) {
      saveIntervalRef.current = setInterval(() => {
        if (messages.length > 0) {
          messages.forEach(msg => {
            storeMessage(msg.text, msg.sender);
          });
        }
      }, 60000); // 60000 ms = 1 minute
    }

    return () => {
      clearInterval(fetchInterval);
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [userKey, currentConversationId, isInitialized, messages]);

  const saveUserKeyToFirestore = async (uid, key) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, { userKey: key }, { merge: true });
      console.log('Saved userKey to Firestore for user:', uid);
      return true;
    } catch (error) {
      console.error('Error saving userKey to Firestore:', error);
      return false;
    }
  };

  const loadUserKeyFromFirestore = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.userKey) {
          setUserKey(data.userKey);
          console.log('Loaded userKey from Firestore for user:', uid);
          return data.userKey;
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading userKey from Firestore:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeApplication = async (firebaseUser) => {
      if (initializationInProgress.current || isInitialized) {
        return;
      }

      initializationInProgress.current = true;
      setIsLoading(true);

      try {
        console.log('Starting application initialization');

        if (!firebaseUser) {
          throw new Error('No authenticated user found');
        }

        const firebaseUid = firebaseUser.uid;
        setUserId(firebaseUid);
        console.log('Using Firebase Auth user ID:', firebaseUid);

        const displayName = firebaseUser.displayName || 'Tautona';
        setUserName(displayName);
        const userData = await createUserInBotpress(firebaseUid, displayName);
        console.log('User creation successful:', userData);

        let keyToUse = userData?.key || userData?.userKey || userKey;
        if (keyToUse) {
          setUserKey(keyToUse);
        }

        console.log('Creating initial conversation with userKey:', keyToUse);
        const conversationResult = await createConversation(keyToUse);
        if (conversationResult?.conversation?.id) {
          setCurrentConversationId(conversationResult.conversation.id);
          console.log('Initial conversation created with ID:', conversationResult.conversation.id);
        } else {
          console.error('Failed to create conversation:', conversationResult);
          Alert.alert('Warning', 'Chat initialized but conversation setup failed. Some features may not work properly.');
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error during application initialization:', error);
        Alert.alert(
          'Initialization Error',
          'There was a problem setting up the chat. Please restart the app or try again later.'
        );
      } finally {
        setIsLoading(false);
        initializationInProgress.current = false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        initializeApplication(user);
      } else {
        setUserId(null);
        setUserKey(null);
        setCurrentConversationId(null);
        setIsInitialized(false);
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const createUserInBotpress = async (id, name) => {
    try {
      console.log(`Creating Botpress user: id=${id}, name=${name}`);
      const url = `${BOTPRESS_WEBHOOK_BASE_URL}/users`;
      const options = {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`
        },
        body: JSON.stringify({ id, name }),
      };

      const response = await fetch(url, options);
      const userKeyHeader = response.headers.get('x-user-key');
      let extractedKey = userKeyHeader || null;

      const responseText = await response.text();
      if (!response.ok) {
        if (response.status === 409) {
          console.warn(`User with id ${id} already exists. Handling gracefully.`);
          try {
            const data = JSON.parse(responseText);
            if (data?.key || data?.userKey) {
              extractedKey = data.key || data.userKey;
              setUserKey(extractedKey);
              await saveUserKeyToFirestore(id, extractedKey);
              return data;
            }
          } catch (parseError) {
            console.warn('Failed to parse 409 response body:', parseError);
          }
          if (!extractedKey) {
            const firestoreKey = await loadUserKeyFromFirestore(id);
            if (firestoreKey) {
              extractedKey = firestoreKey;
              setUserKey(extractedKey);
              return { id, name, userKey: extractedKey, message: 'User already exists, key loaded from Firestore' };
            }
          }
          return { id, name, message: 'User already exists' };
        }
        throw new Error(`Failed to create user: ${response.status} - ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        if (!extractedKey && (data.key || data.userKey)) {
          extractedKey = data.key || data.userKey;
          setUserKey(extractedKey);
          await saveUserKeyToFirestore(id, extractedKey);
        }

        if (data.user && data.user.name) {
          setUserName(data.user.name);
        }

        await setDoc(doc(db, 'users', id), {
          userKey: extractedKey,
          userDetails: data.user || { id, name },
          createdAt: serverTimestamp()
        }, { merge: true });

        return data;
      } catch (parseError) {
        console.warn('Response not valid JSON:', parseError);
        if (extractedKey) {
          return { id, name, userKey: extractedKey };
        }
        throw new Error('Invalid response format and no user key found');
      }
    } catch (error) {
      console.error('Error creating user in Botpress:', error);
      throw error;
    }
  };

  const createConversation = async (overrideUserKey) => {
    const keyToUse = overrideUserKey || userKey;
    if (!keyToUse) {
      console.error('Cannot create conversation: userKey is missing');
      return null;
    }

    try {
      const url = `${BOTPRESS_WEBHOOK_BASE_URL}/conversations`;
      const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-user-key': keyToUse,
        },
        body: JSON.stringify({}),
      };

      const response = await fetch(url, options);
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status} - ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        return data;
      } catch (parseError) {
        console.warn('Response not valid JSON:', parseError);
        return { raw: responseText };
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const storeMessage = async (message, sender) => {
    try {
      // Use client-side timestamp instead of serverTimestamp for arrayUnion
      const timestamp = new Date();
      const messageData = {
        text: message,
        sender,
        timestamp,
        userId: userId || 'anonymous',
        conversationId: currentConversationId || 'unknown',
      };

      // await addDoc(collection(db, 'chatMessages'), messageData);

      const docRef = doc(db, 'chatMessages', userId || 'anonymous');
      await setDoc(
        docRef,
        {
          messages: arrayUnion(messageData),
          userId: userId || 'anonymous', // Link the document to the logged-in user
        },
        { merge: true }
      );

      // Also add client message to escalations/{conversationId}/messages for staff to receive
      if (sender === 'user') {
        try {
          await addDoc(collection(db, 'escalations', userId, 'messages'), {
            text: message,
            sender: 'user',
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          console.error('Error syncing client message to escalations messages:', error);
        }
      }

      console.log(`Stored ${sender} message in Firestore document`);
      return true;
    } catch (error) {
      console.error('Error storing message:', error);
      return false;
    }
  };

  const escalateToHuman = async (userMessage, botResponse, title = null) => {
    try {
      const escalationData = {
        userId: userId || 'anonymous', // Include the client ID
        userName: userName || 'Unknown', // Include the user name for staff reference
        userMessage,
        botResponse,
        createdAt: serverTimestamp(),
        status: 'pending', // Status of the escalation
        conversationId: currentConversationId || 'unknown', // Include the conversation ID
        confidence: null, // Confidence level (if applicable)
        title: title || 'General Escalation', // Title of the escalation
      };

      console.log('Creating escalation record...');
      // Save escalation data under escalations/{userId} document using setDoc with merge
      const escalationDocRef = doc(db, 'escalations', userId || 'anonymous');
      await setDoc(escalationDocRef, escalationData, { merge: true });

      // Fetch chat messages from Firestore document chatMessages/{userId}
      let storedMessages = [];
      try {
        const chatMessagesDocRef = doc(db, 'chatMessages', userId || 'anonymous');
        const chatMessagesDocSnap = await getDoc(chatMessagesDocRef);
        if (chatMessagesDocSnap.exists()) {
          const data = chatMessagesDocSnap.data();
          storedMessages = data.messages || [];
          console.log(`Fetched ${storedMessages.length} messages from Firestore for escalation.`);
        } else {
          console.warn('No chatMessages document found for userId:', userId);
        }
      } catch (fetchError) {
        console.error('Error fetching chatMessages for escalation:', fetchError);
      }

      // Store fetched messages in arrayUnion under escalations/{userId} document
      if (storedMessages.length > 0) {
        await setDoc(
          escalationDocRef,
          {
            messages: arrayUnion(
              ...storedMessages.map(msg => ({
                text: msg.text,
                sender: msg.sender,
                createdAt: msg.timestamp || serverTimestamp(),
              }))
            )
          },
          { merge: true }
        );
        console.log('Stored full conversation messages in arrayUnion under escalation document');
      }

      console.log('Escalation record created successfully');
      return true;
    } catch (error) {
      console.error('Error creating escalation record:', error);
      return false;
    }
  };

  const refreshConversation = async () => {
    try {
      setIsLoading(true);

      const conversationResult = await createConversation();
      if (!conversationResult || !conversationResult.conversation || !conversationResult.conversation.id) {
        throw new Error('Failed to create new conversation');
      }

      const newConvId = conversationResult.conversation.id;
      setCurrentConversationId(newConvId);
      console.log('Created new conversation with ID:', newConvId);

      setMessages([]);

      const welcomeMsg = "New conversation started. How can I help you today?";
      setMessages([{ text: welcomeMsg, sender: 'bot', timestamp: new Date() }]);
      await storeMessage(welcomeMsg, 'bot');

      return true;
    } catch (error) {
      console.error('Error refreshing conversation:', error);
      Alert.alert('Error', 'Failed to start new conversation: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

const handleSend = async () => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(async () => {
      const trimmedText = inputText.trim();
      if (!trimmedText) return;

      if (!userId || !userKey) {
        Alert.alert('Not Ready', 'The chat is still initializing. Please wait a moment and try again.');
        return;
      }

      if (!currentConversationId) {
        try {
          const conversationResult = await createConversation();
          if (conversationResult?.conversation?.id) {
            setCurrentConversationId(conversationResult.conversation.id);
          } else {
            Alert.alert('Error', 'Failed to create conversation. Please try again.');
            return;
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to create conversation: ' + error.message);
          return;
        }
      }

      setInputText('');

      const userMessage = {
        id: `user_${Date.now()}`,
        text: trimmedText,
        sender: 'user',
        timestamp: new Date(),
      };

      try {
        await storeMessage(trimmedText, 'user');

        // Implement user activity logging
        await addDoc(collection(db, 'userActivityLogs'), {
          userId: userId || 'anonymous',
          message: trimmedText,
          timestamp: serverTimestamp(),
          type: 'userMessage',
        });

        const url = `${BOTPRESS_WEBHOOK_BASE_URL}/messages`;
        const options = {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
            'X-User-Key': userKey,
          },
          body: JSON.stringify({
            conversationId: currentConversationId,
            payload: {
              type: 'text',
              text: trimmedText,
            }
          }),
        };

        console.log(`Sending message to Botpress: "${trimmedText}"`);
        const response = await fetch(url, options);

          let botResponse = "Sorry, I couldn't understand that.";
          let confidence = 1.0;
          let data = null;

          if (response.ok) {
            const responseText = await response.text();
            console.log('Botpress raw response:', responseText);

            if (responseText) {
              try {
                data = JSON.parse(responseText);

                if (data.responses && Array.isArray(data.responses) && data.responses.length > 0) {
                  botResponse = data.responses
                    .map(r => r.text || r.message || r.content || '')
                    .filter(Boolean)
                    .join('\n');

                  if (data.responses[0] && typeof data.responses[0].confidence === 'number') {
                    confidence = data.responses[0].confidence;
                  }
                } else if (data.text) {
                  botResponse = data.text;
                } else if (data.message) {
                  botResponse = data.message;
                } else if (data.content) {
                  botResponse = data.content;
                }

                if (typeof data.confidence === 'number') {
                  confidence = data.confidence;
                } else if (typeof data.intentConfidence === 'number') {
                  confidence = data.intentConfidence;
                }
              } catch (parseError) {
                console.error('Error parsing Botpress response:', parseError);
                botResponse = "I received a response but couldn't understand it.";
              }
            }
          } else {
            const errorStatus = response.status;
            console.error(`Botpress API error: ${errorStatus}`);
            botResponse = `Sorry, I'm having trouble connecting to the service (Error ${errorStatus}).`;
          }

            if (data && data.responses && Array.isArray(data.responses) && data.responses.length > 0) {
              // Removed direct addition of bot messages to avoid duplication
              // Rely on fetchMessages polling to update messages
              const botResponseText = data.responses.map(r => r.text || r.message || r.content || '').filter(Boolean).join('\n');
              console.log('Storing bot response:', botResponseText);
              if (botResponseText) {
                await storeMessage(botResponseText, 'bot');
              } else {
                console.warn('Bot response text is empty, skipping storeMessage');
              }

              // Log bot response for activity and efficiency reports
              await addDoc(collection(db, 'userActivityLogs'), {
                userId: userId || 'anonymous',
                message: botResponseText,
                timestamp: serverTimestamp(),
                type: 'botResponse',
                confidence: confidence,
              });
            } else {
              fetchMessages();
            }

          // Escalate based on specific keywords in user message
          const escalationKeywords = [
            'demo cancellation',
            'cancel demo',
            'renew subscription',
            'cancel subscription',
            'more information on demo'
          ];

          const lowerText = trimmedText.toLowerCase();
          const shouldEscalate = escalationKeywords.some(keyword => lowerText.includes(keyword));

            if (shouldEscalate) {
              console.log(`User message contains escalation keyword - escalating to human`);
              // Find the matched keyword to use as title
              const matchedKeyword = escalationKeywords.find(keyword => lowerText.includes(keyword)) || 'User Escalation';
              escalateToHuman(trimmedText, botResponse, matchedKeyword);
            }

            // Escalate if bot response confidence is below threshold or bot gives generic fallback response
            const fallbackResponses = [
              "Sorry, I couldn't understand that.",
              "I received a response but couldn't understand it.",
              "Sorry, I'm having trouble connecting to the service (Error 500).",
              "Sorry, I'm having trouble connecting to the service (Error 503).",
              "Sorry, I'm having trouble connecting to the service (Error 504)."
            ];

            const isFallbackResponse = fallbackResponses.some(fallback => typeof botResponse === 'string' && botResponse.includes(fallback));
            if ((confidence < ESCALATION_CONFIDENCE_THRESHOLD || isFallbackResponse) && userId && currentConversationId) {
              const escalationTitle = `Escalation for User: ${userId} - Conversation: ${currentConversationId}`;
              console.log(`Low confidence or fallback response detected - escalating to human with title: ${escalationTitle}`);
              escalateToHuman(trimmedText, botResponse, escalationTitle);
            }


      } catch (error) {
        console.error('Error in message flow:', error);
      }
    }, 100);
  };

  const renderItem = useCallback(({ item }) => {
    let displayText = '';
    if (typeof item.text === 'string') {
      displayText = item.text;
    } else {
      displayText = '[Unsupported message content]';
    }

    const timeString = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    let senderName = 'Bot';
    if (item.sender === 'user') {
      senderName = 'You';
    } else if (item.sender === 'staff') {
      senderName = 'Staff';
    }

    return (
      <View
        style={[
          styles.message,
          item.sender === 'user' ? styles.userMessage : item.sender === 'staff' ? styles.staffMessage : styles.botMessage,
          item.isError && styles.errorMessage,
        ]}
      >
        <Text style={[styles.senderName, item.isError && styles.errorText]}>{senderName}</Text>
        <Text style={item.isError ? styles.errorText : null}>{displayText}</Text>
        <Text style={styles.timestamp}>{timeString}</Text>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.botInfo}>
              <View style={styles.botIcon}>
                <Text style={styles.botIconText}>B</Text>
              </View>
              <Text style={styles.botName}>BOT</Text>
            </View>
            <TouchableOpacity onPress={() => {}} style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {!isInitialized && isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Initializing chat...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={item => item.id?.toString() || item.timestamp?.getTime().toString() || Math.random().toString()}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              contentContainerStyle={styles.messagesList}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No messages yet. Start a conversation!</Text>
                </View>
              }
            />
          )}

          {isLoading && isInitialized && (
            <View style={styles.typingIndicatorContainer}>
              <Text style={styles.typingIndicatorText}>Typing...</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="camera" size={24} color="#666" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              placeholderTextColor="#666"
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isLoading && isInitialized}
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
                onPress={handleSend}
                disabled={isLoading || !inputText.trim() || !isInitialized}
                style={styles.sendButton}
              >
                <Ionicons
                  name="send"
                  size={28}
                  color={isLoading || !inputText.trim() || !isInitialized ? '#aaa' : '#007AFF'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
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
    backgroundColor: '#ECECEC',
  },
  errorMessage: {
    backgroundColor: '#FFECEC',
    borderWidth: 1,
    borderColor: '#FFCACA',
  },
  errorText: {
    color: '#D8000C',
  },
  typingIndicatorContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typingIndicatorText: {
    fontStyle: 'italic',
    color: '#666',
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
});

export default ChatbotScreen;
