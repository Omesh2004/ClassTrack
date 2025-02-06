import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db, collection, getDocs, doc, updateDoc } from '@/utils/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import styles from './styles';

interface Semester {
  id: string;
  name: string;
  order: number;
}

const StudentSemesterScreen: React.FC = () => {
  const { year } = useLocalSearchParams();  // <-- FIXED: Call the function
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!year) return; // Prevent fetching if year is undefined

    const fetchSemesters = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, `years/${year}/semesters`));
        const semesterList = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data() as Omit<Semester, 'id'>,
          }))
          .sort((a, b) => a.order - b.order);
        setSemesters(semesterList);
      } catch (error) {
        console.error('Error fetching semesters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, [year]);

  const handleSemesterSelect = async (semesterId: string) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { semester: semesterId });
    }
    router.push(`/Student/courses?year=${year}&semester=${semesterId}`);
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
      {semesters.map((semester) => (
        <TouchableOpacity key={semester.id} style={styles.button} onPress={() => handleSemesterSelect(semester.id)}>
          <Text style={styles.buttonText}>{semester.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default StudentSemesterScreen;
