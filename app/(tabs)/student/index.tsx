import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { db, collection, getDocs } from '../../../utils/firebaseConfig';

const StudentHome: React.FC = () => {
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const notificationsList = [];
        coursesSnapshot.forEach((doc) => {
          const data = doc.data();
          notificationsList.push({ id: doc.id, ...data });
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
            onPress={() => router.push(`/student/attendanceScreen?course=${item.id}`)}
          >
            <Text style={styles.courseName}>{item.id}</Text>
            <Text>Class Time: {item.classTime}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  notification: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default StudentHome;
