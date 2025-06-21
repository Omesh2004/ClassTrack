import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from '@/utils/firebaseConfig';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [isLoading, setIsLoading] = useState(true);

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
      Alert.alert('Error', 'Failed to load academic information');
    }
  };

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const coursesSnapshot = await getDocs(
        collection(db, 'years', yearId as string, 'semesters', semesterId as string, 'courses')
      );
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        code: doc.data().code,
        semesterId: doc.data().semesterId,
        yearId: doc.data().yearId
      }));
      setCourses(coursesData as Course[]);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const addCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await addDoc(
        collection(db, 'years', yearId as string, 'semesters', semesterId as string, 'courses'), 
        {
          name: newCourseName.trim(),
          code: newCourseCode.trim().toUpperCase(),
          semesterId,
          yearId,
          createdAt: new Date().toISOString()
        }
      );
      setNewCourseName('');
      setNewCourseCode('');
      fetchCourses();
    } catch (error) {
      console.error('Error adding course:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Failed to add course';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (course: Course) => {
    Alert.alert(
      'Confirm Deletion',
      `Delete "${course.code} - ${course.name}" and all its content?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('Deletion cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, 'years', yearId as string, 'semesters', semesterId as string, 'courses', course.id)
              );
              fetchCourses();
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', 'Failed to delete course');
            }
          }
        }
      ],
      { cancelable: true }
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="menu-book" size={48} color="#64748b" />
      <Text style={styles.emptyTitle}>No Courses Found</Text>
      <Text style={styles.emptyText}>
        Add your first course to start organizing content
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Course }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseCode}>{item.code}</Text>
          <Text style={styles.courseName}>{item.name}</Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditCourse(item)}
          >
            <MaterialIcons name="edit" size={20} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => deleteCourse(item)}
          >
            <MaterialIcons name="delete" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.background}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Course Management</Text>
        <Text style={styles.subtitle}>
          {yearName} • {semesterName}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { flex: 0.6 }]}
          placeholder="Course Code (e.g. CS101)"
          placeholderTextColor="#94a3b8"
          value={newCourseCode}
          onChangeText={setNewCourseCode}
          autoCapitalize="characters"
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Course Name"
          placeholderTextColor="#94a3b8"
          value={newCourseName}
          onChangeText={setNewCourseName}
        />
        <TouchableOpacity 
          style={styles.addButton}
          onPress={addCourse}
          disabled={!newCourseName.trim() || !newCourseCode.trim() || isLoading}
        >
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.addButtonText}>Add</Text>
            <MaterialIcons name="add" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editingCourse}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Course</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Course Code"
              placeholderTextColor="#94a3b8"
              value={editCourseCode}
              onChangeText={setEditCourseCode}
              autoCapitalize="characters"
              autoFocus
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Course Name"
              placeholderTextColor="#94a3b8"
              value={editCourseName}
              onChangeText={setEditCourseName}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingCourse(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveEditedCourse}
                disabled={!editCourseName.trim() || !editCourseCode.trim()}
              >
                <LinearGradient
                  colors={['#4f46e5', '#7c3aed']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    height: 50,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 50,
    width: 100,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  courseName: {
    fontSize: 16,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  modalInput: {
    height: 50,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 50,
  },
  cancelButton: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    maxWidth: 200,
  },
  saveButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default CourseManagement;