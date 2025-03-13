import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { db, collection, getDocs, doc, updateDoc } from '@/utils/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import styles from './styles';
interface Year {
  id: string;
  name: string;
  order: number;
}

const StudentYearScreen: React.FC = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'years'));
        const yearsList = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data() as Omit<Year, 'id'>,
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

  const handleYearSelect = async (yearId: string) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { year: yearId });
    }
    router.push(`/student/semester?year=${yearId}`);
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
      {years.map((year) => (
        <TouchableOpacity key={year.id} style={styles.button} onPress={() => handleYearSelect(year.id)}>
          <Text style={styles.buttonText}>{year.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default StudentYearScreen;
