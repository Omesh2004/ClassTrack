import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  updateDoc,
  doc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE',
  authDomain: 'attendance-app-7a21e.firebaseapp.com',
  projectId: 'attendance-app-7a21e',
  storageBucket: 'attendance-app-7a21e.appspot.com',
  messagingSenderId: '47121417247',
  appId: '1:47121417247:web:1e086ee27fe10c20e9412a',
  measurementId: 'G-SMF4LTTV59',
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AttendanceScreen: React.FC = () => {
  const { course } = useLocalSearchParams();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          Alert.alert('Error', 'No user is currently logged in.');
          return;
        }

        console.log('Current user email:', currentUser.email);

        // Query the Firestore `users` collection using the logged-in user's email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUser.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const user = querySnapshot.docs[0].data();
          setUserData(user);
        } else {
          console.error('No user found with the given email.');
          Alert.alert('Error', 'User data not found in Firestore.');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to fetch user data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleAttendance = async (status: 'Present' | 'Absent') => {
    try {
      if (!userData) {
        Alert.alert('Error', 'User data not available. Please try again later.');
        return;
      }

      const courseDocRef = doc(db, 'courses', course as string);

      await updateDoc(courseDocRef, {
        attendance: arrayUnion({
          studentName: userData.name, // Using fetched name from Firestore
          status,
          timestamp: new Date().toISOString(),
        }),
      });

      Alert.alert('Success', `You have been marked as ${status}.`);
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading user data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course: {course}</Text>
      <Text style={styles.subtitle}>
        Welcome, {userData?.name || 'Student'}
      </Text>
      <Text style={styles.subtitle}>Class Time: Fetch class time from DB here</Text>
      <View style={styles.buttons}>
        <Button title="Present" onPress={() => handleAttendance('Present')} />
        <Button title="Absent" onPress={() => handleAttendance('Absent')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
  },
});

export default AttendanceScreen;
