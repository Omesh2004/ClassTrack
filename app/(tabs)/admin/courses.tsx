import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, collection, getDocs, doc, getDoc } from '@/utils/firebaseConfig';

interface Course {
  id: string;
  name: string;
  code: string;
}

const CourseScreen: React.FC = () => {
  const { year, semester } = useLocalSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [yearName, setYearName] = useState<string>('');
  const [semesterName, setSemesterName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch year name
        const yearDoc = await getDoc(doc(db, 'years', year as string));
        if (yearDoc.exists()) {
          setYearName(yearDoc.data().name);
        }

        // Fetch semester name
        const semesterDoc = await getDoc(doc(db, 'years', year as string, 'semesters', semester as string));
        if (semesterDoc.exists()) {
          setSemesterName(semesterDoc.data().name);
        }

        // Fetch courses
        const coursesSnapshot = await getDocs(
          collection(db, 'years', year as string, 'semesters', semester as string, 'courses')
        );
        const coursesList = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<Course, 'id'>
        }));
        setCourses(coursesList);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, semester]);

  const handleCoursePress = (course: Course) => {
    router.push({
      pathname: '/admin/settime',
      params: { 
        course: course.name,
        courseId: course.id,
        courseCode: course.code,
        year: year,               // ✅ Pass year
        semester: semester        // ✅ Pass semester
      },
    });
  };
  

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{yearName}</Text>
      <Text style={styles.subtitle}>{semesterName}</Text>
      
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.courseCard} 
            onPress={() => handleCoursePress(item)}
          >
            <Text style={styles.courseCode}>{item.code}</Text>
            <Text style={styles.courseName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No courses available.</Text>
        }
      />
     
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: 10,
  },
  courseCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 4,
  },
  courseName: {
    fontSize: 18,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});

export default CourseScreen;