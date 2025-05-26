import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const FeedbackScreen = () => {
  const [chatbotFeedback, setChatbotFeedback] = useState('');
  const [serviceQualityFeedback, setServiceQualityFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!chatbotFeedback.trim() && !serviceQualityFeedback.trim()) {
      Alert.alert('Error', 'Please provide feedback before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        chatbotFeedback: chatbotFeedback.trim(),
        serviceQualityFeedback: serviceQualityFeedback.trim(),
        createdAt: serverTimestamp(),
      });
      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      setChatbotFeedback('');
      setServiceQualityFeedback('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again later.');
      console.error('Feedback submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>Provide Feedback</Text>

        <Text style={styles.label}>Chatbot Feedback</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="How was your experience with the chatbot?"
          value={chatbotFeedback}
          onChangeText={setChatbotFeedback}
          editable={!submitting}
        />

        <Text style={styles.label}>Service Quality Feedback</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="How would you rate the overall service quality?"
          value={serviceQualityFeedback}
          onChangeText={setServiceQualityFeedback}
          editable={!submitting}
        />

        <View style={styles.buttonContainer}>
          <Button title={submitting ? 'Submitting...' : 'Submit Feedback'} onPress={handleSubmit} disabled={submitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    color: '#002f6c',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#004aad',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 10,
  },
});

export default FeedbackScreen;
