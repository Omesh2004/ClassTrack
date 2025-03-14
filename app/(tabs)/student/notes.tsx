import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router'; // Import useLocalSearchParams
import { getDownloadURL, ref, listAll } from 'firebase/storage';
import { storage } from '../../../utils/firebaseConfig';
import * as FileSystem from 'expo-file-system';

const Notes = () => {
  // Fetch query parameters
  const params = useLocalSearchParams();
  const { course, courseId, courseName } = params || {};

  // State to store the list of files
  const [files, setFiles] = useState([]);

  // Log the query parameters
  console.log('Course Details:', {
    course,
    courseId,
    courseName,
  });

  // Function to fetch all files in the folder
  const fetchFilesFromStorage = async () => {
    try {
      if (!courseName) {
        Alert.alert('Error', 'Course name is missing.');
        return;
      }

      // Define the path to the folder in Firebase Storage
      const folderPath = `${courseName}/`;

      // Create a reference to the folder
      const folderRef = ref(storage, folderPath);

      // List all files in the folder
      const result = await listAll(folderRef);

      // Fetch download URLs for each file
      const fileList = await Promise.all(
        result.items.map(async (item) => {
          const downloadURL = await getDownloadURL(item);
          return {
            name: item.name, // File name
            url: downloadURL, // Download URL
            path: item.fullPath, // Full path to the file in Firebase Storage
          };
        })
      );

      // Set the files state
      setFiles(fileList);

      // Log the list of files
      console.log('Files in Folder:', fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
      Alert.alert('Error', 'Failed to fetch files. Please try again.');
    }
  };

  // Function to download a file
  const downloadFile = async (fileUrl, fileName) => {
    try {
      if (Platform.OS === 'web') {
        // For web, open the file in a new tab
        window.open(fileUrl, '_blank');
        Alert.alert('Success', `File "${fileName}" is ready to download.`);
      } else {
        // For native platforms, use expo-file-system
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        const { uri } = await FileSystem.downloadAsync(fileUrl, fileUri);
        console.log('File downloaded to:', uri);
        Alert.alert('Success', `File "${fileName}" downloaded successfully!`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file. Please try again.');
    }
  };

  // Fetch files when the component mounts
  useEffect(() => {
    fetchFilesFromStorage();
  }, [courseName]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notes for {courseName || 'Unknown Course'}</Text>

      {/* Display the list of files */}
      {files.map((file, index) => (
        <TouchableOpacity
          key={index}
          style={styles.fileItem}
          onPress={() => downloadFile(file.url, file.name)}
        >
          <Text style={styles.fileName}>{file.name}</Text>
          <Text style={styles.downloadText}>Tap to download</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default Notes;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  fileItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
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
  },
  downloadText: {
    fontSize: 14,
    color: '#4285F4',
    marginTop: 5,
  },
});