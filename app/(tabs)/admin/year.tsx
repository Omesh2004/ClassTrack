import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView,
  ScrollView,
  Alert 
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { db, collection, getDocs } from '@/utils/firebaseConfig';

interface Year {
  id: string;
  name: string;
  order: number;
}

const YearScreen: React.FC = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const fetchYears = async () => {
      try {
        setLoading(true);
        setError('');
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
        setError('Failed to load years. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchYears();
  }, []);

  const handleYearSelect = (yearId: string, yearName: string) => {
    try {
      router.push(`/admin/semester?year=${yearId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate. Please try again.');
    }
  };

  const handleRetry = () => {
    setYears([]);
    setError('');
    setLoading(true);
    // Re-trigger the useEffect
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
        setError('Failed to load years. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchYears();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading years...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Select Academic Year</Text>
          <Text style={styles.subtitle}>Choose the year to manage classes and attendance</Text>
        </View>

        {/* Error State */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Years List */}
        <View style={styles.contentContainer}>
          {years.length > 0 ? (
            <View style={styles.yearsContainer}>
              {years.map((year, index) => (
                <TouchableOpacity
                  key={year.id}
                  style={[
                    styles.yearCard,
                    index === 0 ? styles.firstCard : null,
                    index === years.length - 1 ? styles.lastCard : null
                  ]}
                  onPress={() => handleYearSelect(year.id, year.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.yearCardContent}>
                    <View style={styles.yearIconContainer}>
                      <Text style={styles.yearIcon}>📚</Text>
                    </View>
                    <View style={styles.yearInfo}>
                      <Text style={styles.yearName}>{year.name}</Text>
                      <Text style={styles.yearDescription}>Manage semesters and classes</Text>
                    </View>
                    <View style={styles.arrowContainer}>
                      <Text style={styles.arrow}>→</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            !loading && !error && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Years Available</Text>
                <Text style={styles.emptyDescription}>
                  No academic years have been set up yet. Please contact your administrator.
                </Text>
              </View>
            )
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.primaryActionButton}>
            <Link href="/admin/attendancedaily" style={styles.linkStyle}>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>👁️</Text>
                <Text style={styles.primaryButtonText}>View Attendance</Text>
              </View>
            </Link>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionButton}>
            <Link href="/login" style={styles.linkStyleSecondary}>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>🔙</Text>
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </View>
            </Link>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    marginBottom: 32,
  },
  yearsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  yearCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  firstCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  lastCard: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  yearCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  yearIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  yearIcon: {
    fontSize: 20,
  },
  yearInfo: {
    flex: 1,
  },
  yearName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  yearDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 18,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionContainer: {
    gap: 12,
  },
  primaryActionButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  linkStyle: {
    padding: 16,
    textDecorationLine: 'none',
  },
  linkStyleSecondary: {
    padding: 16,
    textDecorationLine: 'none',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default YearScreen;