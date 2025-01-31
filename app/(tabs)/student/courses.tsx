import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { db, collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from '@/utils/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import { useLocalSearchParams } from 'expo-router';
import { getDoc } from '@/utils/firebaseConfig';

interface Course {
  id: string;
  name: string;
  code: string;
}

const StudentCourseScreen: React.FC = () => {
  const { year, semester } = useLocalSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [processingCourse, setProcessingCourse] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch available courses
        const coursesSnapshot = await getDocs(
          collection(db, `years/${year}/semesters/${semester}/courses`)
        );
        const courseList = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Course
        }));
        setCourses(courseList);

        // Fetch user's enrolled courses
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setEnrolledCourses(userDoc.data().enrolledCourses || []);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, year, semester]);

  const handleEnrollment = async (courseName: string, isEnrolled: boolean) => {
    if (!user) return;

    setProcessingCourse(courseName);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (isEnrolled) {
        await updateDoc(userRef, {
          enrolledCourses: arrayRemove(courseName)
        });
        setEnrolledCourses(prev => prev.filter(name => name !== courseName));
      } else {
        await updateDoc(userRef, {
          enrolledCourses: arrayUnion(courseName)
        });
        setEnrolledCourses(prev => [...prev, courseName]);
      }
    } catch (error) {
      console.error('Error updating enrollment:', error);
    } finally {
      setProcessingCourse(null);
    }
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
      <Text style={styles.title}>Available Courses</Text>
      {courses.map((course) => {
        const isEnrolled = enrolledCourses.includes(course.name);
        const isProcessing = processingCourse === course.name;

        return (
          <TouchableOpacity
            key={course.id}
            style={[
              styles.courseButton,
              isEnrolled && styles.enrolledButton,
              isProcessing && styles.processingButton
            ]}
            onPress={() => handleEnrollment(course.name, isEnrolled)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={isEnrolled ? "#fff" : "#007BFF"} />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={[
                  styles.buttonText,
                  isEnrolled && styles.enrolledButtonText
                ]}>
                  {course.code} - {course.name}
                </Text>
                {isEnrolled && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

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
  courseButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enrolledButton: {
    backgroundColor: '#6c757d',
  },
  processingButton: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  enrolledButtonText: {
    color: '#f8f9fa',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
});

export default StudentCourseScreen;