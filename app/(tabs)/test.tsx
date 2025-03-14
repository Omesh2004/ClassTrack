import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE",
  authDomain: "attendance-app-7a21e.firebaseapp.com",
  projectId: "attendance-app-7a21e",
  storageBucket: "attendance-app-7a21e.firebasestorage.app",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59",
};

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 📌 Function to Get or Generate Unique ID
const getUniqueId = async () => {
  try {
    let storedId = await AsyncStorage.getItem('deviceUniqueId');

    if (!storedId) {
      if (Platform.OS === 'web') {
        storedId = localStorage.getItem('deviceUniqueId') || uuidv4();
        localStorage.setItem('deviceUniqueId', storedId);
      } else if (Platform.OS === 'android') {
        storedId = Application.androidId || uuidv4();
      } else if (Platform.OS === 'ios') {
        storedId = await SecureStore.getItemAsync('deviceUniqueId');
        if (!storedId) {
          storedId = uuidv4();
          await SecureStore.setItemAsync('deviceUniqueId', storedId);
        }
      }

      await AsyncStorage.setItem('deviceUniqueId', storedId);
    }

    return storedId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    return 'error-id';
  }
};

// 📌 Function to Store in Firestore
const storeDeviceIdInFirestore = async (deviceId: string) => {
  try {
    const deviceType = Platform.OS; // ios, android, or web
    const docRef = doc(db, 'devices', deviceId); // Store ID as document name

    await setDoc(docRef, {
      deviceId,
      deviceType,
      timestamp: new Date().toISOString(),
    });

    console.log('Device ID stored in Firestore:', deviceId);
  } catch (error) {
    console.error('Error storing device ID:', error);
  }
};

const App = () => {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceId = async () => {
      const id = await getUniqueId();
      setDeviceId(id);
    };
    fetchDeviceId();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Unique ID</Text>
      <Text style={styles.idText}>{deviceId || 'Generating...'}</Text>
      <Button
        title="Generate & Store UID"
        onPress={async () => {
          if (deviceId) {
            await storeDeviceIdInFirestore(deviceId);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  idText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default App;
