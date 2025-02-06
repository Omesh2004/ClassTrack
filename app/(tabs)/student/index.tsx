import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/utils/firebaseConfig';
import { collection, getDocs, doc, getDoc, onSnapshot, query } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface Course {
  id: string;
  name: string;
  classTime: string;
  code: string;
  hasScheduledClass: boolean;
  FIXED_LATITUDE?: number;
  FIXED_LONGITUDE?: number;
}

const StudentHome: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

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
        setLoading(false);
        return;
      }
  
      const coursesRef = collection(db, `years/${userData?.year}/semesters/${userData?.semester}/courses`);
      const q = query(coursesRef);
  
      const unsubscribe = onSnapshot(q, (snapshot: { docs: any[]; }) => {
        const userCourses = snapshot.docs
          .filter((doc) => enrolledCourses.includes(doc.data().name))
          .map((doc) => {
            const courseData = doc.data();
            return {
              id: doc.id,
              name: courseData.name,
              code: courseData.code,
              classTime: courseData.classTime || "TBD",
              hasScheduledClass: courseData.classTime && courseData.classTime !== "TBD",
              FIXED_LATITUDE: courseData.FIXED_LATITUDE,
              FIXED_LONGITUDE: courseData.FIXED_LONGITUDE,
            };
          });
  
        setCourses(userCourses);
        setLoading(false);
      });
  
      // Cleanup function to unsubscribe from real-time updates
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData().then((unsubscribe) => {
      return () => {
        // Unsubscribe from Firestore listener
        unsubscribe && unsubscribe();
      };
    });
  }, [user]);
  

  const handleCoursePress = async (course: Course) => {
  try {
    if (!user || !userData) return;

    // Check if classTime is "TBD"
    if (course.classTime === "TBD") {
      setModalVisible(true);
      return;
    }

    // Get today's date in the required format
    const today = (() => {
      const local = new Date();
      return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
    })();

    console.log("Today's date:", today);

    // Attendance document reference
    const attendanceRef = doc(
      db,
      `years/${userData.year}/semesters/${userData.semester}/courses/${course.id}/attendance/${today}`
    );

    const attendanceDoc = await getDoc(attendanceRef);

    if (attendanceDoc.exists()) {
      const attendanceData = attendanceDoc.data();

      // Check if the current user has marked attendance
      const userAttendanceRecord = attendanceData.students?.find(
        (student: any) => student.studentId === user.uid
      );

      if (userAttendanceRecord) {
        console.log("User is already present:", userAttendanceRecord);
        setModalVisible(true); // Show modal to make the tab inactive
        return; // Exit the function to prevent further actions
      } else {
        console.log("User has not marked attendance yet.");
      }
    } else {
      console.log("Attendance document does not exist for today");
    }

    // Navigation logic to allow marking attendance
    if (course.FIXED_LATITUDE !== undefined && course.FIXED_LONGITUDE !== undefined) {
      router.push({
        pathname: '/Student/attendanceScreen',
        params: {
          course: course.id,
          year: userData?.year,
          semester: userData?.semester,
        },
      });
    } else {
      setModalVisible(true); // Show modal if coordinates are missing
    }
  } catch (error) {
    console.error("Error checking attendance:", error);
  }
};
  
  

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={[styles.courseCard, item.hasScheduledClass && styles.scheduledCourseCard]}
      onPress={() => handleCoursePress(item)}
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseCode}>{item.code}</Text>
        <Text 
          style={[styles.timeBadge, item.hasScheduledClass && styles.scheduledTimeBadge]}
        >
          {item.classTime}
        </Text>
      </View>
      <Text style={styles.courseName}>{item.name}</Text>
      {item.hasScheduledClass && <Text style={styles.availableText}>Available for attendance</Text>}
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
          onPress={() => router.push('/Student/year')}
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
      <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>

      {/* Modal for inactive tab */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>This tab is inactive right now.</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F9F9FC' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  header: { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  editProfileButton: { backgroundColor: '#007BFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  editProfileButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  courseCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  scheduledCourseCard: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#93C5FD' },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseCode: { fontSize: 16, fontWeight: '600', color: '#2D2D2D' },
  timeBadge: { backgroundColor: '#E8E8E8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, color: '#666666', fontSize: 14 },
  scheduledTimeBadge: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  courseName: { fontSize: 16, color: '#4A4A4A', lineHeight: 24 },
  availableText: { fontSize: 14, color: '#2563EB', marginTop: 8, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, color: '#6B7280', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#9CA3AF' },
  refreshButton: { backgroundColor: '#007BFF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  refreshButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 10, alignItems: 'center' },
  modalText: { fontSize: 16, marginBottom: 10 },
  modalButton: { backgroundColor: '#007BFF', padding: 10, borderRadius: 5 },
  modalButtonText: { color: '#FFF', fontSize: 16 }
});

export default StudentHome; 