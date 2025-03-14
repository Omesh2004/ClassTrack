import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router'; // Import useLocalSearchParams
import { getStorage, ref, uploadBytes } from 'firebase/storage';

import { utils } from '@react-native-firebase/app';
const PDFUploader = () => {
  const storage = getStorage();
  const [file, setFile] = useState(null);

  // Fetch query parameters
  const params = useLocalSearchParams();
  const { course, courseId, courseCode, year, semester } = params || {};

  // Log the query parameters
  console.log('Query Parameters:', {
    course,
    courseId,
    courseCode,
    year,
    semester,
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        console.log('Selected file:', selectedFile);
        setFile(selectedFile);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      Alert.alert('Error', 'Please select a file first.');
      return;
    }

    try {
      // Construct the file path in Firebase Storage
      const pathToFile = `${course}/${file.name}`;
      const storageRef = ref(storage, pathToFile);

      // Upload the file
      const response = await fetch(file.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);

      Alert.alert('Success', 'File uploaded successfully!');
      console.log('File uploaded successfully:', pathToFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>PDF Uploader</Text>
        <Text style={styles.subtitle}>
          Course: {course} ({courseCode})
        </Text>
        <Text style={styles.subtitle}>Year: {year}</Text>
        <Text style={styles.subtitle}>Semester: {semester}</Text>
        <TouchableOpacity style={styles.button} onPress={pickDocument}>
          <Text style={styles.buttonText}>Select PDF</Text>
        </TouchableOpacity>
        {file && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{file.name}</Text>
            <TouchableOpacity
              style={[styles.button, styles.uploadButton]}
              onPress={handleUpload}
            >
              <Text style={styles.buttonText}>Upload</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#0F9D58',
    marginTop: 15,
  },
  fileInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
});

export default PDFUploader;