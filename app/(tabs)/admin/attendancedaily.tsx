import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db, collection, getDocs } from '@/utils/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';

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
  const navigation = useNavigation();

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

    router.push({
      pathname: '/admin/AttendanceScreen',
      params: {
        yearId: selectedYear,
        semesterId: selectedSemester,
        courseId: selectedCourse,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Year, Semester & Course</Text>

      <Picker selectedValue={selectedYear} onValueChange={(value) => setSelectedYear(value)}>
        <Picker.Item label="Select Year" value={null} />
        {years.map((year) => (
          <Picker.Item key={year.id} label={year.name} value={year.id} />
        ))}
      </Picker>

      {selectedYear && (
        <Picker selectedValue={selectedSemester} onValueChange={(value) => setSelectedSemester(value)}>
          <Picker.Item label="Select Semester" value={null} />
          {semesters.map((sem) => (
            <Picker.Item key={sem.id} label={sem.name} value={sem.id} />
          ))}
        </Picker>
      )}

      {selectedYear && selectedSemester && (
        <Button title="Fetch Courses" onPress={fetchCourses} />
      )}

      {courses.length > 0 && (
        <Picker selectedValue={selectedCourse} onValueChange={(value) => setSelectedCourse(value)}>
          <Picker.Item label="Select Course" value={null} />
          {courses.map((course) => (
            <Picker.Item key={course.id} label={course.name} value={course.id} />
          ))}
        </Picker>
      )}

      {selectedCourse && (
        <Button title="View Attendance" onPress={goToAttendanceScreen} />
      )}

      {loading && <ActivityIndicator size="large" color="#007BFF" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default SelectionScreen;
