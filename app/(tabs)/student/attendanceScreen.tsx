import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { db, updateDoc, doc, arrayUnion } from '../../../utils/firebaseConfig';

const AttendanceScreen: React.FC = () => {
  const { course } = useLocalSearchParams();
  const [studentName] = useState('John Doe'); // Replace with dynamic student info (e.g., from context or login)

  const handleAttendance = async (status: 'Present' | 'Absent') => {
    try {
      const courseDocRef = doc(db, 'courses', course as string);

      await updateDoc(courseDocRef, {
        attendance: arrayUnion({
          studentName,
          status,
        }),
      });

      Alert.alert('Success', `You have been marked as ${status}.`);
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course: {course}</Text>
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
