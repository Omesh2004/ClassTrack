import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

const { width: screenWidth } = Dimensions.get('window');

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
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const fetchTodaysSessionFromGroup = async (
    yearId: string,
    semesterId: string,
    courseId: string
  ) => {
    const todayIST = () => {
      const now = new Date();
      const IST_OFFSET = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + IST_OFFSET);
      return istTime.toISOString().split('T')[0];
    };
    
    const today = todayIST();
  
    const sessionsGroupQuery = query(
      collectionGroup(db, 'sessions'),
      where('date', '==', today),
      where('courseId', '==', courseId),
      orderBy('classTime', 'desc'),
      limit(1)
    );
  
    try {
      const sessionSnapshot = await getDocs(sessionsGroupQuery);
      if (!sessionSnapshot.empty) {
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

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      setUserData(userData);

      const enrolledCourses = userData?.enrolledCourses || [];
      if (enrolledCourses.length === 0) {
        setCourses([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

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
        setRefreshing(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
      setRefreshing(false);
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

      const attendancePath = `years/${userData.year}/semesters/${userData.semester}/courses/${course.id}/attendance/${today}/sessions/${course.currentSession.sessionId}`;
      const attendanceRef = doc(db, attendancePath);
      const attendanceDoc = await getDoc(attendanceRef);

      if (attendanceDoc.exists()) {
        const attendanceData = attendanceDoc.data();
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

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === 'TBD') return 'TBD';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const renderCourseCard = ({ item, index }: { item: Course; index: number }) => (
    <TouchableOpacity
      style={[
        styles.courseCard,
        { 
          transform: [{ scale: 1 }],
          opacity: 1,
        }
      ]}
      onPress={() => handleCoursePress(item)}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={
          item.hasScheduledClass 
            ? ['#667eea', '#764ba2'] 
            : ['#f093fb', '#f5576c']
        }
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.courseCardContent}>
          {item.hasScheduledClass && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          
          <View style={styles.courseHeader}>
            <View style={styles.courseCodeContainer}>
              <Text style={styles.courseCode}>{item.code}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {formatTime(item.currentSession?.classTime || 'TBD')}
              </Text>
            </View>
          </View>
          
          <Text style={styles.courseName} numberOfLines={2}>
            {item.name}
          </Text>
          
          <View style={styles.courseFooter}>
            {item.hasScheduledClass ? (
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>📍 Ready for attendance</Text>
              </View>
            ) : (
              <View style={styles.statusContainer}>
                <Text style={styles.statusTextInactive}>⏰ No class scheduled</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.headerTitle}>Your Courses</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push("/student/year")}
            >
              <Text style={styles.profileButtonText}>👤</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{courses.length}</Text>
              <Text style={styles.statLabel}>Enrolled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {courses.filter(c => c.hasScheduledClass).length}
              </Text>
              <Text style={styles.statLabel}>Active Today</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.notesButton]} 
        onPress={() => router.push("/student/notescourse")}
      >
        <LinearGradient
          colors={['#ffecd2', '#fcb69f']}
          style={styles.actionButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.actionButtonIcon}>📚</Text>
          <Text style={styles.actionButtonText}>View Notes</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.refreshButton]} 
        onPress={() => fetchData(true)}
        disabled={refreshing}
      >
        <LinearGradient
          colors={['#a8edea', '#fed6e3']}
          style={styles.actionButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#333" />
          ) : (
            <Text style={styles.actionButtonIcon}>🔄</Text>
          )}
          <Text style={styles.actionButtonText}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.loadingContainer}
      >
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourseCard}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderActionButtons}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No courses yet</Text>
            <Text style={styles.emptySubText}>
              Start by enrolling in your first course
            </Text>
            <TouchableOpacity 
              style={styles.enrollButton}
              onPress={() => router.push("/student/year")}
            >
              <Text style={styles.enrollButtonText}>Enroll Now</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal 
        visible={modalVisible} 
        transparent={true} 
        animationType="fade"
        statusBarTranslucent
      >
        <BlurView intensity={80} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>Class Not Available</Text>
            <Text style={styles.modalText}>
              This class is not active right now. Please check back during scheduled class hours.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 16,
    color: '#ffffff80',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  profileButtonText: {
    fontSize: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    borderRadius: 20,
    padding: 20,
    backdropFilter: 'blur(10px)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#ffffff80',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#ffffff20',
    marginHorizontal: 20,
  },
  courseCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientBackground: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  courseCardContent: {
    padding: 24,
    minHeight: 140,
  },
  liveBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff25',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
    marginRight: 6,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseCodeContainer: {
    backgroundColor: '#ffffff25',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  timeContainer: {
    backgroundColor: '#ffffff15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  courseName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    lineHeight: 26,
  },
  courseFooter: {
    marginTop: 'auto',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  statusTextInactive: {
    fontSize: 14,
    color: '#ffffff80',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionButtonGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  notesButton: {},
  refreshButton: {},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  enrollButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  enrollButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginHorizontal: 20,
    minWidth: screenWidth - 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconText: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalButton: {
    borderRadius: 16,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  modalButtonGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default StudentHome;