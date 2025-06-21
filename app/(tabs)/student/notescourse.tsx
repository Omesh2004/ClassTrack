import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/utils/firebaseConfig';
import { collection, getDocs, doc, getDoc, query } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

interface Course {
  id: string;
  name: string;
}

const { width } = Dimensions.get('window');

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
        courseName: course.name,
        course: course.id,
        year: userData?.year,
        semester: userData?.semester,
      },
    });
  };

  const renderCourseCard = ({ item, index }: { item: Course; index: number }) => (
    <TouchableOpacity 
      style={[styles.courseCard, { marginLeft: index % 2 === 0 ? 0 : 8 }]} 
      onPress={() => handleCoursePress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        <View style={styles.courseIcon}>
          <Text style={styles.courseInitial}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.courseName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>View Details</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>📚</Text>
      </View>
      <Text style={styles.emptyTitle}>No Courses Yet</Text>
      <Text style={styles.emptySubtitle}>
        You haven't enrolled in any courses. Contact your administrator to get started.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.headerTitle}>Your Courses</Text>
          <Text style={styles.headerSubtitle}>
            {courses.length} {courses.length === 1 ? 'course' : 'courses'} enrolled
          </Text>
        </View>
      </LinearGradient>

      {/* Course List */}
      <View style={styles.content}>
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseCard}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          columnWrapperStyle={courses.length > 0 ? styles.row : undefined}
        />
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: -10,
    backgroundColor: '#f8fafc',
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  courseCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradientCard: {
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default StudentHome;