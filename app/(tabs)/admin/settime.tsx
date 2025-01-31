import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db, setDoc, doc } from '@/utils/firebaseConfig';
import * as Location from 'expo-location';

const SetTimeScreen: React.FC = () => {
  // Extract query params from the URL
  const params = useLocalSearchParams();
  const { course, courseId, courseCode, year, semester } = params || {};

  // State for class time and location
  const [time, setTime] = useState('');
  const [location, setLocation] = useState<{ lat: number; long: number } | null>(null);

  // Debugging: Log the received params
  useEffect(() => {
    console.log('📌 Received Params:', params);
    if (!year || !semester) {
      console.error('❌ Missing year or semester:', { year, semester });
      Alert.alert('Error', 'Missing year or semester. Please navigate from the correct page.');
    }
  }, []);

  // Function to request location permission and fetch GPS coordinates
  const askForLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access was denied.');
        return null;
      }
      const location = await Location.getCurrentPositionAsync({});
      return { lat: location.coords.latitude, long: location.coords.longitude };
    } catch (error) {
      console.error('❌ Error getting location:', error);
      return null;
    }
  };

  // Function to handle saving the class time
  const handleSaveTime = async () => {
    if (!time) {
      Alert.alert('Error', 'Please enter a valid class time.');
      return;
    }

    if (!year || !semester || !courseId) {
      console.error('❌ Missing required parameters:', { year, semester, courseId });
      Alert.alert('Error', 'Invalid parameters. Please navigate from the correct page.');
      return;
    }

    const fetchedLocation = await askForLocationPermission();
    if (!fetchedLocation) {
      Alert.alert('Error', 'Failed to fetch location. Please try again.');
      return;
    }

    try {
      // Firestore document path: /years/{year}/semesters/{semester}/courses/{courseId}
      const courseDocRef = doc(db, 'years', year as string, 'semesters', semester as string, 'courses', courseId as string);
      console.log('🗄️ Firestore Path:', `years/${year}/semesters/${semester}/courses/${courseId}`);

      // Save class time and location to Firestore
      await setDoc(
        courseDocRef,
        {
          classTime: time,
          FIXED_LATITUDE: fetchedLocation.lat,
          FIXED_LONGITUDE: fetchedLocation.long,
        },
        { merge: true }
      );

      // Success alert and redirect
      Alert.alert(
        'Success',
        `Class time for ${courseCode} (${course}) has been set to ${time}. Location saved.`,
        [{ text: 'OK', onPress: () => router.push(`/admin/courses?year=${year}&semester=${semester}`) }]
      );
    } catch (error) {
      console.error('❌ Error saving class time:', error);
      Alert.alert('Error', 'Failed to save the class time. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Time for {course || 'Unknown Course'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter class time (e.g., 10:00 AM)"
        value={time}
        onChangeText={setTime}
      />
      <TouchableOpacity style={styles.button} onPress={handleSaveTime}>
        <Text style={styles.buttonText}>Save Time</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, marginBottom: 20, backgroundColor: '#fff' },
  button: { width: '100%', height: 50, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SetTimeScreen;
