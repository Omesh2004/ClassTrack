import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db, collection, getDocs, doc, updateDoc } from '@/utils/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

interface Semester {
  id: string;
  name: string;
  order: number;
}

const StudentSemesterScreen: React.FC = () => {
  const { year } = useLocalSearchParams();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!year) return;

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
    setSelectedSemester(semesterId);
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { semester: semesterId });
      } catch (error) {
        console.error('Error updating user semester:', error);
      }
    }
    router.push(`/student/courses?year=${year}&semester=${semesterId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#6C63FF', '#4A42E8']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading Semesters...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#6C63FF', '#4A42E8']}
        style={styles.header}
      >
        <Text style={styles.title}>Select Your Semester</Text>
        <Text style={styles.subtitle}>Choose to view your courses</Text>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {semesters.length > 0 ? (
          semesters.map((semester) => (
            <TouchableOpacity 
              key={semester.id} 
              style={[
                styles.semesterCard,
                selectedSemester === semester.id && styles.selectedCard
              ]}
              onPress={() => handleSemesterSelect(semester.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.semesterIcon}>
                  <MaterialIcons name="school" size={24} color="#6C63FF" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.semesterName}>{semester.name}</Text>
                  <Text style={styles.semesterOrder}>Semester {semester.order}</Text>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  size={24} 
                  color="#64748B" 
                  style={styles.arrowIcon}
                />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="error-outline" size={48} color="#64748B" />
            <Text style={styles.emptyText}>No semesters available</Text>
            <Text style={styles.emptySubtext}>Please check back later</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Inter_500Medium',
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  semesterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  cardContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  semesterIcon: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  semesterName: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  semesterOrder: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  arrowIcon: {
    marginLeft: 16,
  },
  emptyState: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    textAlign: 'center' as const,
  },
};

export default StudentSemesterScreen;