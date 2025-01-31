import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { db, collection, getDocs } from '@/utils/firebaseConfig';

interface Year {
  id: string;
  name: string;
  order: number;
}

const YearScreen: React.FC = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'years'));
        const yearsList = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data() as Omit<Year, 'id'>
          }))
          .sort((a, b) => a.order - b.order);
        setYears(yearsList);
      } catch (error) {
        console.error('Error fetching years:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchYears();
  }, []);

  const handleYearSelect = (yearId: string) => {
    router.push(`/admin/semester?year=${yearId}`);
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
      <Text style={styles.title}>Select Year</Text>
      {years.length > 0 ? (
        years.map((year) => (
          <TouchableOpacity
            key={year.id}
            style={styles.button}
            onPress={() => handleYearSelect(year.id)}
          >
            <Text style={styles.buttonText}>{year.name}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>No years available</Text>
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
    marginBottom: 20,
    color: '#333',
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

export default YearScreen;