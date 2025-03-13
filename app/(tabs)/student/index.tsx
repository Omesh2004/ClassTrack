import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/utils/firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  collectionGroup,
  orderBy,
  limit,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface Session {
  FIXED_LATITUDE: number;
  FIXED_LONGITUDE: number;
  classTime: string;
  sessionId: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  currentSession: Session | null;
  hasScheduledClass: boolean;
}

const StudentHome: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const fetchTodaysSessionFromGroup = async (
    yearId: string,
    semesterId: string,
    courseId: string
  ) => {
    const todayIST = () => {
      const now = new Date();
      // Convert to milliseconds and adjust for IST (+5:30)
      const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC +5:30
      const istTime = new Date(now.getTime() + IST_OFFSET);
      
      // Format the date in YYYY-MM-DD format
      return istTime.toISOString().split('T')[0];
    };
    
    const today = todayIST();
  
    // Query the sessions collection group
    const sessionsGroupQuery = query(
      collectionGroup(db, 'sessions'),
      where('date', '==', today), // Filter by today's date
      where('courseId', '==', courseId), // Ensure session matches courseId
      orderBy('classTime', 'desc'), // Order by classTime in descending order
      limit(1) // Limit to the latest session
    );
  
    try {
      const sessionSnapshot = await getDocs(sessionsGroupQuery);
      if (!sessionSnapshot.empty) {
        // Fetch the latest session for the course
        const sessionData = sessionSnapshot.docs[0].data() as Session;
        return {
          sessionId: sessionSnapshot.docs[0].id,
          classTime: sessionData.classTime,
          FIXED_LATITUDE: sessionData.FIXED_LATITUDE,
          FIXED_LONGITUDE: sessionData.FIXED_LONGITUDE,
        };
      }
    } catch (error) {
      console.error(`Error fetching sessions for course ${courseId}:`, error);
    }
    return null;
  };
  

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Fetch user data
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      setUserData(userData);

      const enrolledCourses = userData?.enrolledCourses || [];
      if (enrolledCourses.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Fetch courses and their sessions
      const coursesRef = collection(
        db,
        `years/${userData?.year}/semesters/${userData?.semester}/courses`
      );
      const q = query(coursesRef);

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const coursesPromises = snapshot.docs
          .filter((doc) => enrolledCourses.includes(doc.data().name))
          .map(async (doc) => {
            const courseData = doc.data();

            // Fetch today's session for the course from collection group
            const session = await fetchTodaysSessionFromGroup(
              userData?.year,
              userData?.semester,
              doc.id
            );

            return {
              id: doc.id,
              name: courseData.name,
              code: courseData.code,
              currentSession: session,
              hasScheduledClass: !!session,
            };
          });

        const userCourses = await Promise.all(coursesPromises);
        setCourses(userCourses);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData().then((unsubscribe) => {
      return () => {
        unsubscribe && unsubscribe();
      };
    });
  }, [user]);

  const handleCoursePress = async (course: Course) => {
    try {
      if (!user || !userData || !course.currentSession){
        setModalVisible(true);
        return;
      }
      if(course.currentSession.classTime===""){
        setModalVisible(true);
      }

      const today = new Date().toISOString().split("T")[0];

      // Check existing attendance
      const attendancePath = `years/${userData.year}/semesters/${userData.semester}/courses/${course.id}/attendance/${today}/sessions/${course.currentSession.sessionId}`;
      const attendanceRef = doc(db, attendancePath);
      const attendanceDoc = await getDoc(attendanceRef);

      if (attendanceDoc.exists()) {
        const attendanceData = attendanceDoc.data();
        console.log("Attendance data:", attendanceData.students);
        const userAttendanceRecord = attendanceData.students?.find(
          (student: any) => student.studentId === user.uid
        );
        if (course.currentSession.classTime==="") {
          setModalVisible(true);
          return;
        }
        if (userAttendanceRecord) {
          setModalVisible(true);
          return;
        }
      }

      if (
        course.currentSession.FIXED_LATITUDE &&
        course.currentSession.FIXED_LONGITUDE
      ) {
        router.push({
          pathname: "/student/attendanceScreen",
          params: {
            course: course.id,
            year: userData?.year,
            semester: userData?.semester,
            sessionId: course.currentSession.sessionId,
          },
        });
      } else {
        setModalVisible(true);
      }
    } catch (error) {
      console.error("Error checking attendance:", error);
    }
  };

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={[
        styles.courseCard,
        item.hasScheduledClass && styles.scheduledCourseCard,
      ]}
      onPress={() => handleCoursePress(item)}
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseCode}>{item.code}</Text>
        <Text
          style={[
            styles.timeBadge,
            item.hasScheduledClass && styles.scheduledTimeBadge,
          ]}
        >
          {item.currentSession?.classTime || "TBD"}
        </Text>
      </View>
      <Text style={styles.courseName}>{item.name}</Text>
      {item.hasScheduledClass && (
        <Text style={styles.availableText}>Available for attendance</Text>
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
          onPress={() => router.push("/student/year")}
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
            <Text style={styles.emptySubText}>
              Enroll in courses through the courses tab
            </Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true} animationType="slide">
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

            
             
