import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from '@/utils/firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!yearId) return;
    fetchYearName();
    fetchSemesters();
  }, [yearId]);

  const fetchYearName = async () => {
    try {
      const yearDoc = await getDoc(doc(db, 'years', yearId as string));
      if (yearDoc.exists()) {
        setYearName(yearDoc.data().name);
      }
    } catch (error) {
      console.error('Error fetching year name:', error);
      Alert.alert('Error', 'Failed to load year information');
    }
  };

  const fetchSemesters = async () => {
    setIsLoading(true);
    try {
      const semestersSnapshot = await getDocs(
        collection(db, 'years', yearId as string, 'semesters')
      );
      const semestersData = semestersSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        order: doc.data().order,
        yearId: doc.data().yearId
      } as Semester)).sort((a, b) => a.order - b.order);
      setSemesters(semestersData);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      Alert.alert('Error', 'Failed to load semesters');
    } finally {
      setIsLoading(false);
    }
  };

  const addSemester = async () => {
    if (!newSemesterName.trim()) {
      Alert.alert('Validation Error', 'Please enter a semester name');
      return;
    }

    try {
      setIsLoading(true);
      await addDoc(collection(db, 'years', yearId as string, 'semesters'), {
        name: newSemesterName.trim(),
        order: semesters.length + 1,
        yearId: yearId,
        createdAt: new Date().toISOString()
      });
      setNewSemesterName('');
      fetchSemesters();
    } catch (error) {
      console.error('Error adding semester:', error);
      Alert.alert('Error', (error instanceof Error && error.message) ? error.message : 'Failed to add semester');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSemester = async (semester: Semester) => {
    Alert.alert(
      'Confirm Deletion',
      `This will delete "${semester.name}" and all associated courses. Continue?`,
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
              await deleteDoc(doc(db, 'years', yearId as string, 'semesters', semester.id));
              fetchSemesters();
            } catch (error) {
              console.error('Error deleting semester:', error);
              Alert.alert('Error', 'Failed to delete semester');
            }
          }
        }
      ],
      { cancelable: true }
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

  const navigateToCourses = (semesterId: string, semesterName: string) => {
    router.push({
      pathname: '/superadmin/courses',
      params: { 
        year: yearId, 
        semester: semesterId,
        semesterName,
        yearName
      }
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="collections-bookmark" size={48} color="#64748b" />
      <Text style={styles.emptyTitle}>No Semesters Found</Text>
      <Text style={styles.emptyText}>
        Add your first semester to organize courses
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Semester }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigateToCourses(item.id, item.name)}
      activeOpacity={0.9}
    >
      <View style={styles.cardContent}>
        <View style={styles.semesterInfo}>
          <Text style={styles.semesterName}>{item.name}</Text>
          <Text style={styles.semesterOrder}>Order: {item.order}</Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditSemester(item);
            }}
          >
            <MaterialIcons name="edit" size={20} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteSemester(item);
            }}
          >
            <MaterialIcons name="delete" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.background}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Semester Management</Text>
        <Text style={styles.subtitle}>{yearName || 'Loading...'}</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter semester name (e.g. First Semester)"
          placeholderTextColor="#94a3b8"
          value={newSemesterName}
          onChangeText={setNewSemesterName}
          onSubmitEditing={addSemester}
        />
        <TouchableOpacity 
          style={styles.addButton}
          onPress={addSemester}
          disabled={!newSemesterName.trim() || isLoading}
        >
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.addButtonText}>Add Semester</Text>
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
          data={semesters}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editingSemester}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSemester(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Semester</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Semester name"
              placeholderTextColor="#94a3b8"
              value={editSemesterName}
              onChangeText={setEditSemesterName}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingSemester(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveEditedSemester}
                disabled={!editSemesterName.trim()}
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
    flex: 1,
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
    minWidth: 140,
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
  semesterInfo: {
    flex: 1,
  },
  semesterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  semesterOrder: {
    fontSize: 14,
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
    marginBottom: 24,
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

export default SemesterManagement;