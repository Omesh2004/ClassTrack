import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView,
  ScrollView,
  StatusBar 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db, collection, getDocs } from '@/utils/firebaseConfig';

interface Semester {
  id: string;
  name: string;
  order: number;
}

const SemesterScreen: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [yearName, setYearName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { year: yearId } = useLocalSearchParams(); // Changed from 'year' to 'yearId' for clarity

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!yearId) {
          console.error('No year ID provided');
          setLoading(false);
          return;
        }

        // Fetch year name
        const yearRef = await getDocs(collection(db, 'years'));
        const yearDoc = yearRef.docs.find(doc => doc.id === yearId);
        if (yearDoc) {
          setYearName(yearDoc.data().name);
        } else {
          console.error('Year not found');
        }

        // Fetch semesters
        const semestersSnapshot = await getDocs(
          collection(db, 'years', yearId as string, 'semesters')
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
  }, [yearId]);

  const handleSemesterSelect = (semesterId: string) => {
    router.push(`/admin/courses?year=${yearId}&semester=${semesterId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading semesters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Semester</Text>
        {yearName && <Text style={styles.subtitle}>{yearName}</Text>}
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {semesters.length > 0 ? (
          <View style={styles.semesterGrid}>
            {semesters.map((semester, index) => (
              <TouchableOpacity
                key={semester.id}
                style={[
                  styles.semesterCard,
                  { 
                    backgroundColor: index % 2 === 0 ? '#f8fafc' : '#f1f5f9',
                    borderLeftColor: index % 2 === 0 ? '#2563eb' : '#059669'
                  }
                ]}
                onPress={() => handleSemesterSelect(semester.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.semesterName}>{semester.name}</Text>
                  <View style={styles.cardIndicator}>
                    <Text style={styles.orderText}>#{semester.order}</Text>
                  </View>
                </View>
                <View style={styles.arrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No Semesters Available</Text>
            <Text style={styles.emptyText}>
              There are no semesters configured for {yearName || 'this year'} yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  semesterGrid: {
    gap: 16,
  },
  semesterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  semesterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  cardIndicator: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  arrow: {
    marginLeft: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
});
export default SemesterScreen;