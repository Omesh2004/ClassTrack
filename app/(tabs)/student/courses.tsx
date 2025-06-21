import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { db, collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from '@/utils/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import { useLocalSearchParams } from 'expo-router';
import { getDoc } from '@/utils/firebaseConfig';

const { width } = Dimensions.get('window');

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
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch available courses
        const coursesSnapshot = await getDocs(
          collection(db, `years/${year}/semesters/${semester}/courses`)
        );
        const courseList = coursesSnapshot.docs.map(doc => {
          const { id, ...data } = doc.data() as Course;
          return {
            id: doc.id,
            ...data
          };
        });
        setCourses(courseList);

        // Fetch user's enrolled courses
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setEnrolledCourses(userDoc.data().enrolledCourses || []);
          }
        }

        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
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
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading Courses...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Available Courses</Text>
          <Text style={styles.headerSubtitle}>
            {courses.length} courses available this semester
          </Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {courses.map((course) => {
            const isEnrolled = enrolledCourses.includes(course.name);
            const isProcessing = processingCourse === course.name;

            return (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.courseCard,
                  isEnrolled && styles.enrolledCard,
                  isProcessing && styles.processingCard
                ]}
                onPress={() => handleEnrollment(course.name, isEnrolled)}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                <View style={styles.cardContent}>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseCode}>{course.code}</Text>
                    <Text style={styles.courseName}>{course.name}</Text>
                  </View>
                  
                  {isProcessing ? (
                    <ActivityIndicator 
                      size="small" 
                      color={isEnrolled ? "#667eea" : "#ffffff"} 
                    />
                  ) : (
                    <View style={[
                      styles.enrollButton,
                      isEnrolled && styles.enrolledButton
                    ]}>
                      <Text style={[
                        styles.enrollButtonText,
                        isEnrolled && styles.enrolledButtonText
                      ]}>
                        {isEnrolled ? 'Enrolled' : 'Enroll'}
                      </Text>
                      {isEnrolled && (
                        <MaterialIcons 
                          name="check-circle" 
                          size={20} 
                          color="#667eea" 
                          style={styles.checkIcon}
                        />
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Inter_500Medium',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 30,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  enrolledCard: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  processingCard: {
    opacity: 0.7,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseInfo: {
    flex: 1,
    marginRight: 16,
  },
  courseCode: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  courseName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  enrollButton: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 90,
    justifyContent: 'center',
  },
  enrolledButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  enrolledButtonText: {
    color: '#667eea',
  },
  checkIcon: {
    marginLeft: 6,
  },
});

export default StudentCourseScreen;