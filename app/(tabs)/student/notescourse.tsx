import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/utils/firebaseConfig';
import { collection, getDocs, doc, getDoc, query } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface Course {
  id: string;
  name: string;
}

const StudentHome: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Fetch user data
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      setUserData(userData);

      const enrolledCourses = userData?.enrolledCourses || [];
      if (enrolledCourses.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Fetch courses
      const coursesRef = collection(
        db,
        `years/${userData?.year}/semesters/${userData?.semester}/courses`
      );
      const q = query(coursesRef);
      const snapshot = await getDocs(q);
      
      const userCourses = snapshot.docs
        .filter((doc) => enrolledCourses.includes(doc.data().name))
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));

      setCourses(userCourses);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCoursePress = (course: Course) => {
    router.push({
      pathname: '/student/notes',
      params: {
        courseName:course.name,
        course: course.id,
        year: userData?.year,
        semester: userData?.semester,
      },
    });
  };

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity style={styles.courseCard} onPress={() => handleCoursePress(item)}>
      <Text style={styles.courseName}>{item.name}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Enrolled Courses</Text>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourseCard}
        ListEmptyComponent={<Text style={styles.emptyText}>No enrolled courses found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F9F9FC' },
  header: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  courseName: { fontSize: 16, fontWeight: '600', color: '#4A4A4A' },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 20 },
});

export default StudentHome;
