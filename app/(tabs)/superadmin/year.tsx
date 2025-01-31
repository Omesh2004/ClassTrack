import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal } from 'react-native';
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from '@/utils/firebaseConfig';
import { useRouter } from 'expo-router';

interface Year {
  id: string;
  name: string;
  order: number;
}

const YearManagement: React.FC = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [newYearName, setNewYearName] = useState('');
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [editYearName, setEditYearName] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'years'));
      const yearsList: Year[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.order - b.order);
      setYears(yearsList);
    } catch (error) {
      console.error('Error fetching years:', error);
      Alert.alert('Error', 'Failed to fetch years');
    }
  };

  const addYear = async () => {
    if (!newYearName.trim()) {
      Alert.alert('Error', 'Please enter a year name');
      return;
    }

    try {
      await addDoc(collection(db, 'years'), { 
        name: newYearName.trim(),
        order: years.length + 1
      });
      fetchYears();
      setNewYearName('');
    } catch (error) {
      console.error('Error adding year:', error);
      Alert.alert('Error', 'Failed to add year');
    }
  };

  const deleteYear = async (year: Year) => {
    Alert.alert(
      'Confirm Delete',
      `Delete ${year.name} and all its semesters/courses?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'years', year.id));
              fetchYears();
            } catch (error) {
              console.error('Error deleting year:', error);
              Alert.alert('Error', 'Failed to delete year');
            }
          }
        }
      ]
    );
  };

  const handleEditYear = (year: Year) => {
    setEditingYear(year);
    setEditYearName(year.name);
  };

  const saveEditedYear = async () => {
    if (!editingYear || !editYearName.trim()) {
      Alert.alert('Error', 'Year name cannot be empty');
      return;
    }

    try {
      await updateDoc(doc(db, 'years', editingYear.id), {
        name: editYearName.trim()
      });
      fetchYears();
      setEditingYear(null);
      setEditYearName('');
    } catch (error) {
      console.error('Error updating year:', error);
      Alert.alert('Error', 'Failed to update year');
    }
  };

  const navigateToSemesters = (yearId: string) => {
    router.push(`/superadmin/semester?year=${yearId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Academic Years</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Year Name (e.g., First Year)"
          value={newYearName}
          onChangeText={setNewYearName}
        />
        <TouchableOpacity style={styles.addButton} onPress={addYear}>
          <Text style={styles.buttonText}>Add Year</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Year Modal */}
      <Modal visible={!!editingYear} transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Year</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new year name"
              value={editYearName}
              onChangeText={setEditYearName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setEditingYear(null)}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={saveEditedYear}
              >
                <Text style={styles.updateButton}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={years}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <TouchableOpacity 
              style={styles.yearName} 
              onPress={() => navigateToSemesters(item.id)}
            >
              <Text style={styles.yearText}>{item.name}</Text>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleEditYear(item)}>
                <Text style={styles.updateText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteYear(item)}>
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
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
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
  yearName: { flex: 1 },
  yearText: { fontSize: 16, color: '#333' },
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

export default YearManagement;