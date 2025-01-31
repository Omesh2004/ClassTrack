import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/utils/firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useLocalSearchParams } from 'expo-router';

interface Course {
  id: string;
  name: string;
  classTime: string;
  code: string;
  hasScheduledClass: boolean;
}

const StudentHome: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        setUserData(userData);

        const enrolledCourses = userData?.enrolledCourses || [];
        if (enrolledCourses.length === 0) {
          setCourses([]);
          return;
        }

        const coursesRef = collection(db, `years/${userData?.year}/semesters/${userData?.semester}/courses`);
        const coursesSnapshot = await getDocs(coursesRef);
        
        console.log("Fetched courses:", coursesSnapshot.docs.map(doc => doc.data())); // Debug log

        // Filter and map courses that the user is enrolled in
        const userCourses = coursesSnapshot.docs
        .filter(doc => enrolledCourses.includes(doc.data().name))
        .map(doc => {
          const courseData = doc.data();
          return {
            id: doc.id,
            name: courseData.name,
            code: courseData.code,
            classTime: courseData.classTime || "TBD",
            hasScheduledClass: courseData.classTime && courseData.classTime !== "TBD"
          };
        });

        console.log("Filtered user courses:", userCourses); // Debug log
        setCourses(userCourses);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={[styles.courseCard, item.hasScheduledClass && styles.scheduledCourseCard]}
      onPress={() => router.push({
        pathname: '/student/attendanceScreen',
        params: { 
          course: item.id,
          year: userData?.year,
          semester: userData?.semester
        }
      })}
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseCode}>{item.code}</Text>
        <Text 
          style={[
            styles.timeBadge,
            item.hasScheduledClass && styles.scheduledTimeBadge
          ]}
        >
          {item.classTime}
        </Text>
      </View>
      <Text style={styles.courseName}>{item.name}</Text>
      {item.hasScheduledClass && (
        <Text style={styles.availableText}>
          Available for attendance
        </Text>
      )}
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
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Your Enrolled Courses</Text>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => router.push('/student/year')}
        >
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourseCard}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No enrolled courses found</Text>
            <Text style={styles.emptySubText}>Enroll in courses through the courses tab</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({ 
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9F9FC',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  editProfileButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
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
  scheduledCourseCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  timeBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#666666',
    fontSize: 14,
  },
  scheduledTimeBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  courseName: {
    fontSize: 16,
    color: '#4A4A4A',
    lineHeight: 24,
  },
  availableText: {
    fontSize: 14,
    color: '#2563EB',
    marginTop: 8,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default StudentHome;