import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db, setDoc, doc } from '../../../utils/firebaseConfig';
import { useRouter } from 'expo-router';

const SetTimeScreen: React.FC = () => {
  const { course } = useLocalSearchParams(); // Retrieve course name from URL
  const [time, setTime] = useState(''); // State to store the class time

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

    try {
      // Create a reference to the course document in Firestore
      const courseDocRef = doc(db, 'courses', sanitizedCourse);
      // Save class time to Firestore
      await setDoc(courseDocRef, {
        classTime: time,
      });

      // Success alert
      Alert.alert(
        'Success',
        `Class time for ${sanitizedCourse} has been set to ${time}.`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/'), // Navigate back to the index page
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
