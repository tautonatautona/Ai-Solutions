import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/ai-service.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.appName}>Ai-Solutions</Text>
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: width * 0.6,
    height: height * 0.6,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  version: {
    fontSize: 16,
    marginTop: 4,
    color: '#666',
  },
});

export default SplashScreen;
