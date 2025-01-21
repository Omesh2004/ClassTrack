import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../../utils/firebaseConfig'; // Ensure this path is correct
import { collection, getDocs } from 'firebase/firestore'; // Import Firestore functions

// Define the shape of a notification object
interface Notification {
  id: string;
  classTime: string; // Add other properties as necessary
}

const StudentHome: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const notificationsList: Notification[] = [];
        coursesSnapshot.forEach((doc) => {
          const data = doc.data();
          // Ensure 'classTime' or other fields exist in the data
          notificationsList.push({ id: doc.id, classTime: data.classTime || 'N/A' });
        });
        setNotifications(notificationsList);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.notification}
            onPress={() => router.push(`/Student/attendanceScreen?course=${item.id}`)}
          >
            <Text style={styles.courseName}>{item.id}</Text>
            <Text>Class Time: {item.classTime}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No notifications available.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  notification: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
});

export default StudentHome;
