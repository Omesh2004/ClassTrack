import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db, collection, getDocs } from '@/utils/firebaseConfig';

interface Semester {
  id: string;
  name: string;
  order: number;
}

const SemesterScreen: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [yearName, setYearName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const { year } = useLocalSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch year name
        const yearRef = await getDocs(collection(db, 'years'));
        const yearDoc = yearRef.docs.find(doc => doc.id === year);
        if (yearDoc) {
          setYearName(yearDoc.data().name);
        }

        // Fetch semesters
        const semestersSnapshot = await getDocs(
          collection(db, 'years', year as string, 'semesters')
        );
        const semestersList = semestersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data() as Omit<Semester, 'id'>
          }))
          .sort((a, b) => a.order - b.order);
        setSemesters(semestersList);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year]);

  const handleSemesterSelect = (semesterId: string) => {
    router.push(`/admin/courses?year=${year}&semester=${semesterId}`);
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
      <Text style={styles.title}>Select Semester</Text>
      <Text style={styles.subtitle}>{yearName}</Text>
      {semesters.length > 0 ? (
        semesters.map((semester) => (
          <TouchableOpacity
            key={semester.id}
            style={styles.button}
            onPress={() => handleSemesterSelect(semester.id)}
          >
            <Text style={styles.buttonText}>{semester.name}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>No semesters available for this year</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default SemesterScreen;