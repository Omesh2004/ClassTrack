import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  StatusBar,
  SafeAreaView,
  Dimensions,
  Pressable
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, collection, getDocs, doc, getDoc } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const yearDoc = await getDoc(doc(db, 'years', year as string));
        if (yearDoc.exists()) {
          setYearName(yearDoc.data().name);
        }

        const semesterDoc = await getDoc(doc(db, 'years', year as string, 'semesters', semester as string));
        if (semesterDoc.exists()) {
          setSemesterName(semesterDoc.data().name);
        }

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

  const openModal = (course: Course) => {
    setSelectedCourse(course);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCourse(null);
  };

  const navigateToSetTime = () => {
    if (selectedCourse) {
      router.push({
        pathname: '/admin/settime',
        params: {
          course: selectedCourse.name,
          courseId: selectedCourse.id,
          courseCode: selectedCourse.code,
          year: year,
          semester: semester
        },
      });
    }
    closeModal();
  };

  const navigateToUpload = () => {
    if (selectedCourse) {
      router.push({ 
        pathname: '/admin/upload',
        params: {
          course: selectedCourse.name,
          courseId: selectedCourse.id,
          courseCode: selectedCourse.code,
          year: year,
          semester: semester
        },
      });
    }
    closeModal();
  };

  const renderCourseItem = ({ item }: { item: Course }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.courseCard,
        pressed && styles.courseCardPressed
      ]} 
      onPress={() => openModal(item)}
    >
      <View style={styles.courseHeader}>
        <View style={styles.courseCodeContainer}>
          <Text style={styles.courseCode}>{item.code}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </View>
      <Text style={styles.courseName}>{item.name}</Text>
    </Pressable>
  );

  const renderActionButton = (title: string, icon: string, onPress: () => void, isPrimary = false) => (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        isPrimary && styles.primaryButton,
        pressed && styles.actionButtonPressed
      ]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={isPrimary ? '#FFFFFF' : '#1F2937'} 
        style={styles.buttonIcon}
      />
      <Text style={[styles.actionButtonText, isPrimary && styles.primaryButtonText]}>
        {title}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.yearTitle}>{yearName}</Text>
          <View style={styles.semesterBadge}>
            <Text style={styles.semesterText}>{semesterName}</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{courses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
        </View>
      </View>

      {/* Courses List */}
      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Course Management</Text>
        
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Courses Available</Text>
              <Text style={styles.emptySubtitle}>
                Courses will appear here once they are added to this semester.
              </Text>
            </View>
          }
        />
      </View>

      {/* Enhanced Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Course Actions</Text>
                {selectedCourse && (
                  <Text style={styles.modalSubtitle}>
                    {selectedCourse.code} - {selectedCourse.name}
                  </Text>
                )}
              </View>
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <View style={styles.modalActions}>
              {renderActionButton("Manage Attendance", "time-outline", navigateToSetTime, true)}
              {renderActionButton("Upload Notes", "cloud-upload-outline", navigateToUpload)}
              {renderActionButton("Cancel", "close-outline", closeModal)}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  yearTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  semesterBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  semesterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  courseCardPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseCodeContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 0.5,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    maxWidth: '80%',
  },
  closeButton: {
    padding: 4,
  },
  modalActions: {
    padding: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonIcon: {
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});

export default CourseScreen;