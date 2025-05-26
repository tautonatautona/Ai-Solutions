import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const ProductRecommendationScreen = ({ route, navigation }) => {
  const { customerId, customerName } = route.params || {};
  const [recommendation, setRecommendation] = useState('');
  const [details, setDetails] = useState('');

  const handleSave = () => {
    if (!recommendation.trim()) {
      Alert.alert('Validation', 'Please enter a product recommendation.');
      return;
    }
    // Here you would typically save the recommendation to a database or send it to backend
    Alert.alert('Success', `Recommendation saved for ${customerName || 'customer'}.`);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9faff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Product Recommendation</Text>
        {customerName && <Text style={styles.subHeader}>For: {customerName}</Text>}

        <Text style={styles.label}>Recommendation *</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={recommendation}
          onChangeText={setRecommendation}
          placeholder="Enter product recommendation"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Details / Notes</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={details}
          onChangeText={setDetails}
          placeholder="Additional details or notes"
          multiline
          numberOfLines={6}
        />

        <View style={styles.buttonRow}>
          <Button title="Cancel" onPress={() => navigation.goBack()} />
          <Button title="Save" onPress={handleSave} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9faff',
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: '#003366',
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#0055cc',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#003366',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
});

export default ProductRecommendationScreen;
