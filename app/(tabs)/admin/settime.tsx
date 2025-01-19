import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db, setDoc, doc } from '../../../utils/firebaseConfig';
import * as Location from "expo-location";

const SetTimeScreen: React.FC = () => {
  const { course } = useLocalSearchParams(); // Retrieve course name from URL
  const [time, setTime] = useState(''); // State to store the class time
  const [location, setLocation] = useState<{ lat: number; long: number } | null>(null); // State for location

  // Function to fetch location
  const askForLocationPermission = async (): Promise<{ lat: number; long: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access was denied.");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      console.log("Fetched Location:", { latitude, longitude }); // Debug logging
      return { lat: latitude, long: longitude };
    } catch (error) {
      console.error("Error getting location:", error);
      return null;
    }
  };

  // Validate and sanitize the course parameter
  const getSanitizedCourse = () => {
    if (!course || (Array.isArray(course) && course.length === 0)) {
      Alert.alert('Error', 'Invalid course selected. Please try again.');
      return null;
    }
    const selectedCourse = Array.isArray(course) ? course[0] : course;
    return selectedCourse?.replace(/[^a-zA-Z0-9_-]/g, ''); // Sanitize course name
  };

  const handleSaveTime = async () => {
    if (!time) {
      Alert.alert('Error', 'Please set a time for the class.');
      return;
    }

    const sanitizedCourse = getSanitizedCourse();
    if (!sanitizedCourse) {
      return;
    }

    // Fetch the admin's location
    const fetchedLocation = await askForLocationPermission();
    if (!fetchedLocation) {
      Alert.alert("Error", "Failed to fetch location. Please try again.");
      return;
    }

    const { lat, long } = fetchedLocation;

    try {
      // Create a reference to the course document in Firestore
      const courseDocRef = doc(db, 'courses', sanitizedCourse);
      // Save class time and location to Firestore
      await setDoc(courseDocRef, {
        classTime: time,
        FIXED_LATITUDE: lat,
        FIXED_LONGITUDE: long,
      });

      // Success alert
      Alert.alert(
        'Success',
        `Class time for ${sanitizedCourse} has been set to ${time}. Location saved.`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/admin/courses'), // Navigate back to the index page
          },
        ]
      );
    } catch (error) {
      console.error('Error saving class time:', error);
      Alert.alert('Error', 'Failed to save the class time. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Time for {course}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter class time (e.g., 10:00 AM)"
        value={time}
        onChangeText={setTime}
      />
      <Button title="Save Time" onPress={handleSaveTime} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
});

export default SetTimeScreen;
