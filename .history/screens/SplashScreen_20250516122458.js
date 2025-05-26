import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/splash-animation.json')} // Replace with your Lottie JSON file path
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // You can change the background color
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: width * 0.6,
    height: height * 0.6,
  },
});

export default SplashScreen;
