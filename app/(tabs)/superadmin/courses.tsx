import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal } from 'react-native';
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from '@/utils/firebaseConfig';
import { useLocalSearchParams } from 'expo-router';

interface Course {
  id: string;
  name: string;
  code: string;
  semesterId: string;
  yearId: string;
}

const CourseManagement: React.FC = () => {
  const { year: yearId, semester: semesterId } = useLocalSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [semesterName, setSemesterName] = useState('');
  const [yearName, setYearName] = useState('');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');

  useEffect(() => {
    fetchMetadata();
    fetchCourses();
  }, [semesterId]);

  const fetchMetadata = async () => {
    try {
      const yearDoc = await getDoc(doc(db, 'years', yearId as string));
      const semesterDoc = await getDoc(doc(db, 'years', yearId as string, 'semesters', semesterId as string));
      
      if (yearDoc.exists() && semesterDoc.exists()) {
        setYearName(yearDoc.data().name);
        setSemesterName(semesterDoc.data().name);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const coursesSnapshot = await getDocs(
        collection(db, 'years', yearId as string, 'semesters', semesterId as string, 'courses')
      );
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData as Course[]);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses');
    }
  };

  const addCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await addDoc(
        collection(db, 'years', yearId as string, 'semesters', semesterId as string, 'courses'), 
        {
          name: newCourseName.trim(),
          code: newCourseCode.trim().toUpperCase(),
          semesterId,
          yearId
        }
      );
      setNewCourseName('');
      setNewCourseCode('');
      fetchCourses();
    } catch (error) {
      console.error('Error adding course:', error);
      Alert.alert('Error', 'Failed to add course');
    }
  };

  const deleteCourse = async (courseId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this course?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, 'years', yearId as string, 'semesters', semesterId as string, 'courses', courseId)
              );
              fetchCourses();
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', 'Failed to delete course');
            }
          }
        }
      ]
    );
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditCourseName(course.name);
    setEditCourseCode(course.code);
  };

  const saveEditedCourse = async () => {
    if (!editingCourse || !editCourseName.trim() || !editCourseCode.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await updateDoc(
        doc(db, 'years', yearId as string, 'semesters', semesterId as string, 'courses', editingCourse.id),
        {
          name: editCourseName.trim(),
          code: editCourseCode.trim().toUpperCase()
        }
      );
      fetchCourses();
      setEditingCourse(null);
    } catch (error) {
      console.error('Error updating course:', error);
      Alert.alert('Error', 'Failed to update course');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Courses for {yearName} - {semesterName}
      </Text>
      
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, { flex: 0.4 }]}
          placeholder="Course Code (e.g., CS101)"
          value={newCourseCode}
          onChangeText={setNewCourseCode}
          autoCapitalize="characters"
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Course Name"
          value={newCourseName}
          onChangeText={setNewCourseName}
        />
        <TouchableOpacity style={styles.addButton} onPress={addCourse}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Course Modal */}
      <Modal visible={!!editingCourse} transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Course</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Course Code (e.g., CS101)"
              value={editCourseCode}
              onChangeText={setEditCourseCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Course Name"
              value={editCourseName}
              onChangeText={setEditCourseName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setEditingCourse(null)}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={saveEditedCourse}
              >
                <Text style={styles.updateButton}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseCode}>{item.code}</Text>
              <Text style={styles.courseName}>{item.name}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleEditCourse(item)}>
                <Text style={styles.updateText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCourse(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f5f5f5' 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#333' 
  },
  inputGroup: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 20 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12,
    backgroundColor: '#fff'
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80
  },
  buttonText: { 
    color: 'white', 
    fontWeight: '600' 
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  courseInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  courseName: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
  },
  updateText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  deleteText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    padding: 10,
    borderRadius: 8,
  },
  cancelButton: {
    color: '#666',
    fontWeight: '600',
  },
  updateButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default CourseManagement;
