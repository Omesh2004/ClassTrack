import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db, collection, getDocs } from '@/utils/firebaseConfig';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface Year {
  id: string;
  name: string;
  order: number;
}

interface Semester {
  id: string;
  name: string;
  order: number;
}

interface Course {
  id: string;
  name: string;
}

const SelectionScreen: React.FC = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'years'));
        const yearsList = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Year, 'id'>
          }))
          .sort((a, b) => a.order - b.order);
        setYears(yearsList);
      } catch (error) {
        console.error('Error fetching years:', error);
      }
    };

    fetchYears();
  }, []);

  useEffect(() => {
    const fetchSemesters = async () => {
      if (!selectedYear) return;
      setLoading(true);
      setSelectedSemester(null);
      setSelectedCourse(null);
      setCourses([]);

      try {
        const querySnapshot = await getDocs(collection(db, 'years', selectedYear, 'semesters'));
        const semesterList = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Semester, 'id'>
          }))
          .sort((a, b) => a.order - b.order);
        setSemesters(semesterList);
      } catch (error) {
        console.error('Error fetching semesters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, [selectedYear]);

  const fetchCourses = async () => {
    if (!selectedYear || !selectedSemester) {
      console.error("Select both Year and Semester first.");
      return;
    }
    setLoading(true);
    setSelectedCourse(null);

    try {
      const querySnapshot = await getDocs(
        collection(db, 'years', selectedYear, 'semesters', selectedSemester, 'courses')
      );
      const courseList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Course, 'id'>
      }));

      setCourses(courseList);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToAttendanceScreen = () => {
    if (!selectedYear || !selectedSemester || !selectedCourse) {
      console.error("Select Year, Semester, and Course first.");
      return;
    }

    try {
      // Fixed navigation - make sure the path matches your file structure
      router.push({
        pathname: '/(tabs)/admin/AttendanceScreen', // Adjust this path to match your actual file structure
        params: {
          yearId: selectedYear,
          semesterId: selectedSemester,
          courseId: selectedCourse,
          yearName: getSelectedYearName(),
          semesterName: getSelectedSemesterName(),
          courseName: getSelectedCourseName(),
        },
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const getSelectedYearName = () => years.find(y => y.id === selectedYear)?.name || '';
  const getSelectedSemesterName = () => semesters.find(s => s.id === selectedSemester)?.name || '';
  const getSelectedCourseName = () => courses.find(c => c.id === selectedCourse)?.name || '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      
      {/* Header */}
      <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Manager</Text>
        <Text style={styles.headerSubtitle}>Select your class details</Text>
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, selectedYear && styles.progressStepActive]} />
            <View style={[styles.progressStep, selectedSemester && styles.progressStepActive]} />
            <View style={[styles.progressStep, selectedCourse && styles.progressStepActive]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Year</Text>
            <Text style={styles.progressLabel}>Semester</Text>
            <Text style={styles.progressLabel}>Course</Text>
          </View>
        </View>

        {/* Selection Cards */}
        <View style={styles.cardsContainer}>
          {/* Year Selection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📚 Academic Year</Text>
              {selectedYear && <Text style={styles.selectedText}>{getSelectedYearName()}</Text>}
            </View>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={selectedYear} 
                onValueChange={(value) => setSelectedYear(value)}
                style={styles.picker}
              >
                <Picker.Item label="Choose academic year..." value={null} color="#9ca3af" />
                {years.map((year) => (
                  <Picker.Item key={year.id} label={year.name} value={year.id} color="#374151" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Semester Selection */}
          {selectedYear && (
            <View style={[styles.card, styles.cardAnimated]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📅 Semester</Text>
                {selectedSemester && <Text style={styles.selectedText}>{getSelectedSemesterName()}</Text>}
              </View>
              <View style={styles.pickerContainer}>
                <Picker 
                  selectedValue={selectedSemester} 
                  onValueChange={(value) => {
                    setSelectedSemester(value);
                    if (value) fetchCourses();
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Choose semester..." value={null} color="#9ca3af" />
                  {semesters.map((sem) => (
                    <Picker.Item key={sem.id} label={sem.name} value={sem.id} color="#374151" />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {/* Course Selection */}
          {courses.length > 0 && (
            <View style={[styles.card, styles.cardAnimated]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>🎓 Course</Text>
                {selectedCourse && <Text style={styles.selectedText}>{getSelectedCourseName()}</Text>}
              </View>
              <View style={styles.pickerContainer}>
                <Picker 
                  selectedValue={selectedCourse} 
                  onValueChange={(value) => setSelectedCourse(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Choose course..." value={null} color="#9ca3af" />
                  {courses.map((course) => (
                    <Picker.Item key={course.id} label={course.name} value={course.id} color="#374151" />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>

        {/* Action Button */}
        {selectedCourse && (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={goToAttendanceScreen}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#10b981', '#059669']} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>📋 Manage Attendance</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Summary Card */}
        {selectedYear && selectedSemester && selectedCourse && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📋 Selection Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Year:</Text>
              <Text style={styles.summaryValue}>{getSelectedYearName()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Semester:</Text>
              <Text style={styles.summaryValue}>{getSelectedSemesterName()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Course:</Text>
              <Text style={styles.summaryValue}>{getSelectedCourseName()}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ... (styles remain the same)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    opacity: 0.9,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  progressStepActive: {
    backgroundColor: '#3b82f6',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardAnimated: {
    transform: [{ scale: 1 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectedText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  picker: {
    height: 50,
  },
  actionButton: {
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#0c4a6e',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});

export default SelectionScreen;