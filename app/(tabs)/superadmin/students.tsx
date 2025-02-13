import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import Icon from '@expo/vector-icons/MaterialIcons';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE",
  authDomain: "attendance-app-7a21e.firebaseapp.com",
  projectId: "attendance-app-7a21e",
  storageBucket: "attendance-app-7a21e.appspot.com",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Screen dimensions and scaling
const { width, height } = Dimensions.get('window');
const scaleFont = (size:number) => Math.round((width / 375) * size);
const scalePadding = (size:number) => Math.round((width / 375) * size);
const isDesktop = width >= 768;

const COLUMN_WIDTHS = {
  name: '25%',
  email: '35%',
  role: '20%',
  uid: '20%',
};

const App: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [newRow, setNewRow] = useState({ name: '', email: '', role: '', uid: '' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'users', id));
              setUsers(users.filter((user) => user.id !== id));
              Alert.alert('Success', 'User deleted successfully.');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete the user.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEdit = async (id: string, updatedData: any) => {
    try {
      await updateDoc(doc(firestore, 'users', id), updatedData);
      setUsers(users.map((user) => (user.id === id ? { ...user, ...updatedData } : user)));
      setEditingRow(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleAdd = async () => {
    try {
      const newDoc = await addDoc(collection(firestore, 'users'), newRow);
      setUsers([...users, { id: newDoc.id, ...newRow }]);
      setNewRow({ name: '', email: '', role: '', uid: '' });
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const TableCell: React.FC<{ children: React.ReactNode, width: string, isLastColumn?: boolean }> = ({ children, width, isLastColumn = false }) => (
    <View
      style={[
        styles.cellContainer,
        { width },
        !isLastColumn && styles.cellBorder,
      ]}
    >
      <Text style={styles.cellText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.headerRow}>
      <TableCell width={COLUMN_WIDTHS.name}>Name</TableCell>
      <TableCell width={COLUMN_WIDTHS.email}>Email</TableCell>
      <TableCell width={COLUMN_WIDTHS.role}>Role</TableCell>
      <TableCell width={'15%'} isLastColumn>
        Actions
      </TableCell>
    </View>
  );

  const renderTableRow = ({ item }: { item: any }) => {
    const isEditing = editingRow === item.id;

    return (
      <View style={styles.row}>
        {isEditing ? (
          <>
            <TextInput
              style={[styles.input, { width: COLUMN_WIDTHS.name }]}
              value={item.name}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, name: text } : user
                ))
              }
              placeholder="Name"
              placeholderTextColor="#999" // Add placeholder color
            />
            <TextInput
              style={[styles.input, { width: COLUMN_WIDTHS.email }]}
              value={item.email}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, email: text } : user
                ))
              }
              placeholder="Email"
              placeholderTextColor="#999" // Add placeholder color
            />
            <TextInput
              style={[styles.input, { width: COLUMN_WIDTHS.role }]}
              value={item.role}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, role: text } : user
                ))
              }
              placeholder="Role"
              placeholderTextColor="#999" // Add placeholder color
            />
            <TouchableOpacity
              onPress={() => handleEdit(item.id, item)}
              style={styles.actionButton}
            >
              <Icon name="save" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TableCell width={COLUMN_WIDTHS.name}>{item.name}</TableCell>
            <TableCell width={COLUMN_WIDTHS.email}>{item.email}</TableCell>
            <TableCell width={COLUMN_WIDTHS.role}>{item.role}</TableCell>
            <TouchableOpacity
              onPress={() => setEditingRow(item.id)}
              style={styles.actionButton}
            >
              <Icon name="edit" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.deleteButton}
            >
              <Icon name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
  <View style={isDesktop ? styles.desktopContainer : styles.mobileContainer}>
    <View style={styles.addForm}>
    <TextInput
  style={styles.input}
  placeholder="Name"
  value={newRow.name}
  onChangeText={(text) => setNewRow({ ...newRow, name: text })}
  placeholderTextColor="#999"
  textAlignVertical="center" // Fixes cursor visibility issue in Android
/>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={newRow.email}
        onChangeText={(text) => setNewRow({ ...newRow, email: text })}
        placeholderTextColor="#999" // Light gray for better visibility
         textAlignVertical="center"
      />
      <TextInput
        style={styles.input}
        placeholder="Role"
        value={newRow.role}
        onChangeText={(text) => setNewRow({ ...newRow, role: text })}
        placeholderTextColor="#999" // Light gray for better visibility
         textAlignVertical="center"
      />
      <Button title="Add User" onPress={handleAdd} color="#007BFF" />
    </View>
    <View style={styles.listContainer}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderTableHeader}
        renderItem={renderTableRow}
        stickyHeaderIndices={[0]}
      />
    </View>
  </View>
</SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: scalePadding(16),
    // Smaller font size for desktop
  },
  desktopContainer: {

    flexDirection: 'row',
    flex: 1,
  },
  mobileContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#007BFF',
    paddingVertical: scalePadding(10),
    paddingHorizontal: scalePadding(8),
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: scalePadding(10),
    paddingHorizontal: scalePadding(8),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cellContainer: {
    justifyContent: 'center',
    paddingHorizontal: scalePadding(4),
  },
  cellText: {
    fontSize: scaleFont(14),
    color: '#333',
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  actionButton: {
    backgroundColor: '#28a745',
    padding: scalePadding(6),
    borderRadius: 4,
    marginHorizontal: scalePadding(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: scalePadding(6),
    borderRadius: 4,
    marginHorizontal: scalePadding(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    height: 40,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: scalePadding(8),
    marginBottom: scalePadding(8),
    backgroundColor: '#fff',
    color: '#000', // Ensure text is visible
    fontSize: isDesktop ? scaleFont(12) : scaleFont(14),
    textAlignVertical: 'center', // Fix cursor visibility issue
  },
  
  addForm: {
    backgroundColor: '#fff',
    padding: scalePadding(16),
    borderRadius: 8,
    marginBottom: isDesktop ? 0 : scalePadding(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: isDesktop ? '30%' : '100%',
  },

  listContainer: {
    flex: 1,
    marginLeft: isDesktop ? scalePadding(16) : 0, 
    fontSize: isDesktop ? 10 : 40, // Add margin on desktop
  },
});

export default App;