import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

const SuperAdminHome = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Super Admin Dashboard</Text>
        
        <TouchableOpacity 
          style={[styles.card, styles.academicsCard]} 
          onPress={() => router.push('/superadmin/year')}
        >
          <Text style={styles.cardTitle}>Academics</Text>
          <Text style={styles.cardDescription}>
            Manage years, semesters, and courses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.studentsCard]} 
          onPress={() => router.push('/superadmin/students')}
        >
          <Text style={styles.cardTitle}>Students</Text>
          <Text style={styles.cardDescription}>
            View and manage student records
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  academicsCard: {
    backgroundColor: '#4a90e2',
  },
  studentsCard: {
    backgroundColor: '#50c878',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
});

export default SuperAdminHome;