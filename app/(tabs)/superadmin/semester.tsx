import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal } from 'react-native';
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from '@/utils/firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface Semester {
  id: string;
  name: string;
  order: number;
  yearId: string;
}

const SemesterManagement: React.FC = () => {
  const { year: yearId } = useLocalSearchParams();
  const router = useRouter();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [newSemesterName, setNewSemesterName] = useState('');
  const [yearName, setYearName] = useState('');
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [editSemesterName, setEditSemesterName] = useState('');

  useEffect(() => {
    if (!yearId) return;
    fetchSemesters();
    fetchYearName();
  }, [yearId]);

  const fetchYearName = async () => {
    try {
      const yearDoc = await getDoc(doc(db, 'years', yearId as string));
      if (yearDoc.exists()) {
        setYearName(yearDoc.data().name);
      }
    } catch (error) {
      console.error('Error fetching year name:', error);
    }
  };

  const fetchSemesters = async () => {
    try {
      const semestersSnapshot = await getDocs(
        collection(db, 'years', yearId as string, 'semesters')
      );
      const semestersData = semestersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.order - b.order);
      setSemesters(semestersData as Semester[]);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      Alert.alert('Error', 'Failed to load semesters');
    }
  };

  const addSemester = async () => {
    if (!newSemesterName.trim()) {
      Alert.alert('Error', 'Please enter a semester name');
      return;
    }

    try {
      await addDoc(collection(db, 'years', yearId as string, 'semesters'), {
        name: newSemesterName.trim(),
        order: semesters.length + 1,
        yearId: yearId
      });
      setNewSemesterName('');
      fetchSemesters();
    } catch (error) {
      console.error('Error adding semester:', error);
      Alert.alert('Error', 'Failed to add semester');
    }
  };

  const deleteSemester = async (semester: Semester) => {
    Alert.alert(
      'Confirm Delete',
      `Delete ${semester.name} and all its courses?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'years', yearId as string, 'semesters', semester.id));
              fetchSemesters();
            } catch (error) {
              console.error('Error deleting semester:', error);
              Alert.alert('Error', 'Failed to delete semester');
            }
          }
        }
      ]
    );
  };

  const handleEditSemester = (semester: Semester) => {
    setEditingSemester(semester);
    setEditSemesterName(semester.name);
  };

  const saveEditedSemester = async () => {
    if (!editingSemester || !editSemesterName.trim()) {
      Alert.alert('Error', 'Semester name cannot be empty');
      return;
    }

    try {
      await updateDoc(
        doc(db, 'years', yearId as string, 'semesters', editingSemester.id),
        { name: editSemesterName.trim() }
      );
      fetchSemesters();
      setEditingSemester(null);
    } catch (error) {
      console.error('Error updating semester:', error);
      Alert.alert('Error', 'Failed to update semester');
    }
  };

  const navigateToCourses = (semesterId: string) => {
    router.push(`/superadmin/courses?year=${yearId}&semester=${semesterId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Semesters for {yearName}</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Semester Name (e.g., 1st Semester)"
          value={newSemesterName}
          onChangeText={setNewSemesterName}
        />
        <TouchableOpacity style={styles.addButton} onPress={addSemester}>
          <Text style={styles.buttonText}>Add Semester</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Semester Modal */}
      <Modal visible={!!editingSemester} transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Semester</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new semester name"
              value={editSemesterName}
              onChangeText={setEditSemesterName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setEditingSemester(null)}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={saveEditedSemester}
              >
                <Text style={styles.updateButton}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={semesters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <TouchableOpacity 
              style={styles.semesterName}
              onPress={() => navigateToCourses(item.id)}
            >
              <Text style={styles.semesterText}>{item.name}</Text>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleEditSemester(item)}>
                <Text style={styles.updateText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteSemester(item)}>
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
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  inputContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { 
    flex: 1, 
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
    alignItems: 'center'
  },
  buttonText: { color: 'white', fontWeight: '600' },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  semesterName: { flex: 1 },
  semesterText: { fontSize: 16, color: '#333' },
  actions: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  updateText: { color: '#007AFF', fontWeight: '600' },
  deleteText: { color: '#ff3b30', fontWeight: '600' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15
  },
  modalButton: {
    padding: 8
  },
  cancelButton: {
    color: '#666'
  },
  updateButton: {
    color: '#007AFF',
    fontWeight: '600'
  }
});

export default SemesterManagement;