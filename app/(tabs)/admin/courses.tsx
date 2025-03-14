import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, collection, getDocs, doc, getDoc } from '@/utils/firebaseConfig';

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
    router.push({ pathname: '/admin/upload',
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{yearName}</Text>
      <Text style={styles.subtitle}>{semesterName}</Text>
      
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.courseCard} 
            onPress={() => openModal(item)}
          >
            <Text style={styles.courseCode}>{item.code}</Text>
            <Text style={styles.courseName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No courses available.</Text>
        }
      />
      
      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select an action</Text>
            <Button title="Go to Course" onPress={navigateToSetTime} />
            <Button title="Upload Notes" onPress={navigateToUpload} />
            <Button title="Cancel" color="red" onPress={closeModal} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: 10,
  },
  courseCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 4,
  },
  courseName: {
    fontSize: 18,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default CourseScreen;