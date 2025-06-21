import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from '@/utils/firebaseConfig';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'years'));
      const yearsList: Year[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name as string,
          order: data.order as number
        };
      }).sort((a, b) => a.order - b.order);
      setYears(yearsList);
    } catch (error) {
      console.error('Error fetching years:', error);
      Alert.alert('Error', 'Failed to fetch years');
    } finally {
      setIsLoading(false);
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
      `Are you sure you want to delete "${year.name}" and all its associated data?`,
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
              await deleteDoc(doc(db, 'years', year.id));
              fetchYears();
            } catch (error) {
              console.error('Error deleting year:', error);
              Alert.alert('Error', 'Failed to delete year');
            }
          }
        }
      ],
      { cancelable: true }
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

  const navigateToSemesters = (yearId: string, yearName: string) => {
    router.push({
      pathname: '/superadmin/semester',
      params: { year: yearId, yearName }
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="school" size={48} color="#64748b" />
      <Text style={styles.emptyTitle}>No Academic Years</Text>
      <Text style={styles.emptyText}>
        Add your first academic year to get started
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Year }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigateToSemesters(item.id, item.name)}
      activeOpacity={0.9}
    >
      <View style={styles.cardContent}>
        <View style={styles.yearInfo}>
          <Text style={styles.yearName}>{item.name}</Text>
          <Text style={styles.yearOrder}>Order: {item.order}</Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditYear(item);
            }}
          >
            <MaterialIcons name="edit" size={20} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteYear(item);
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
        <Text style={styles.title}>Academic Years</Text>
        <Text style={styles.subtitle}>Manage your institution's academic structure</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter year name (e.g. First Year)"
          placeholderTextColor="#94a3b8"
          value={newYearName}
          onChangeText={setNewYearName}
          onSubmitEditing={addYear}
        />
        <TouchableOpacity 
          style={styles.addButton}
          onPress={addYear}
          disabled={!newYearName.trim()}
        >
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.addButtonText}>Add Year</Text>
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
          data={years}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editingYear}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingYear(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Year</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Year name"
              placeholderTextColor="#94a3b8"
              value={editYearName}
              onChangeText={setEditYearName}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingYear(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveEditedYear}
                disabled={!editYearName.trim()}
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
    width: 120,
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
  yearInfo: {
    flex: 1,
  },
  yearName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  yearOrder: {
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

export default YearManagement;