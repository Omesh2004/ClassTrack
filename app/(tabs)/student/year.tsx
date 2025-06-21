import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList,
  StatusBar,
  Dimensions,
  Platform,
  Animated,
  Alert,
  RefreshControl,
  AccessibilityInfo
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { db, collection, getDocs, doc, updateDoc } from '@/utils/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Year {
  id: string;
  name: string;
  order: number;
}

interface StudentYearScreenProps {
  onYearSelected?: (yearId: string, yearName: string) => void;
}

const StudentYearScreen: React.FC<StudentYearScreenProps> = ({ onYearSelected }) => {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const animatedValues = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(0))
  ).current;
  
  const router = useRouter();
  const { user } = useAuth();
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Cache management
  const CACHE_KEY = 'academic_years_cache';
  const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
useFocusEffect(
    useCallback(() => {
      // Reset selection state when screen comes into focus
      setSelectedYear(null);
      
      // Optional: Refresh data when screen comes into focus
      // fetchYears(false);
    }, [])
  );
  const getCachedYears = async (): Promise<Year[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Error reading cache:', error);
    }
    return null;
  };

  const setCachedYears = async (years: Year[]) => {
    try {
      const cacheData = {
        data: years,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error setting cache:', error);
    }
  };

  const fetchYears = useCallback(async (useCache = true) => {
    try {
      setError(null);
      
      // Try cache first if not refreshing
      if (useCache && !refreshing) {
        const cachedYears = await getCachedYears();
        if (cachedYears && isMounted.current) {
          setYears(cachedYears);
          setLoading(false);
          animateCards(cachedYears);
          return;
        }
      }

      const querySnapshot = await getDocs(collection(db, 'years'));
      const yearsList = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data() as Omit<Year, 'id'>,
        }))
        .sort((a, b) => a.order - b.order);

      if (!isMounted.current) return;

      setYears(yearsList);
      await setCachedYears(yearsList);
      animateCards(yearsList);
      setRetryCount(0);
      
    } catch (error) {
      console.error('Error fetching years:', error);
      
      if (!isMounted.current) return;
      
      // Try to use cached data as fallback
      const cachedYears = await getCachedYears();
      if (cachedYears) {
        setYears(cachedYears);
        animateCards(cachedYears);
        setError('Using offline data. Pull to refresh for latest updates.');
      } else {
        setError('Failed to load academic years. Please check your connection and try again.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [refreshing]);

  const animateCards = (yearsList: Year[]) => {
    yearsList.forEach((_, index) => {
      if (index < animatedValues.length) {
        animatedValues[index].setValue(0);
        Animated.timing(animatedValues[index], {
          toValue: 1,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchYears(false);
  }, [fetchYears]);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setLoading(true);
      fetchYears(false);
    } else {
      Alert.alert(
        'Connection Error',
        'Unable to connect after multiple attempts. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    }
  }, [retryCount, fetchYears]);

   const handleYearSelect = async (yearId: string, yearName: string) => {
    if (!user || selectedYear === yearId) return; // Prevent duplicate selection
    
    setSelectedYear(yearId);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        year: yearId,
        yearName: yearName,
        updatedAt: new Date().toISOString()
      });

      AccessibilityInfo.announceForAccessibility(`Selected ${yearName}`);
      onYearSelected?.(yearId, yearName);
      
      router.push(`/student/semester?year=${yearId}&yearName=${encodeURIComponent(yearName)}`);
    } catch (error) {
      console.error('Error updating year:', error);
      setSelectedYear(null);
      
      Alert.alert(
        'Update Failed',
        'Failed to save your selection. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleYearSelect(yearId, yearName) }
        ]
      );
    }
  };

  const getYearIcon = (yearName: string): string => {
    const year = yearName.toLowerCase();
    if (year.includes('1st') || year.includes('first')) return '🎓';
    if (year.includes('2nd') || year.includes('second')) return '📚';
    if (year.includes('3rd') || year.includes('third')) return '🎯';
    if (year.includes('4th') || year.includes('fourth')) return '🏆';
    if (year.includes('5th') || year.includes('fifth')) return '💼';
    return '📖';
  };

  const getGradientColors = (index: number): [string, string] => {
    const gradients: [string, string][] = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#a8edea', '#fed6e3'],
      ['#ffecd2', '#fcb69f'],
      ['#ff9a9e', '#fecfef'],
    ];
    return gradients[index % gradients.length];
  };

  const renderYearCard = ({ item, index }: { item: Year; index: number }) => {
    const isSelected = selectedYear === item.id;
    const animatedValue = animatedValues[index] || new Animated.Value(1);

    return (
      <Animated.View
        style={{
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={[
            styles.yearCard,
            isSelected && styles.selectedCard,
          ]}
          onPress={() => handleYearSelect(item.id, item.name)}
          activeOpacity={0.85}
          disabled={loading || isSelected}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.name}`}
          accessibilityHint={`Tap to select ${item.name} as your academic year`}
          accessibilityState={{ 
            selected: isSelected,
            disabled: loading || isSelected 
          }}
        >
          <LinearGradient
            colors={getGradientColors(index)}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Text style={styles.yearIcon} accessible={false}>
                    {getYearIcon(item.name)}
                  </Text>
                </View>
                
                {isSelected && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator 
                      size="small" 
                      color="#ffffff" 
                      accessibilityLabel="Loading"
                    />
                  </View>
                )}
              </View>
              
              <View style={styles.cardBody}>
                <Text style={styles.yearName}>{item.name}</Text>
                <Text style={styles.yearSubtitle}>
                  {isSelected ? 'Loading...' : 'Tap to select'}
                </Text>
              </View>
              
              <View style={styles.cardFooter}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>Year {item.order}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText} accessible={false}>🎓</Text>
          </View>
          <Text style={styles.headerTitle}>Select Your Year</Text>
          <Text style={styles.headerSubtitle}>
            Choose your current academic year to get started
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar} accessible={true} accessibilityLabel="Progress: Step 1 of 3">
              <View style={[styles.progressFill, { width: '33%' }]} />
            </View>
            <Text style={styles.progressText}>Step 1 of 3</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton} 
        onPress={handleRetry}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Retry loading academic years"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && years.length === 0) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.loadingScreen}
      >
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Text style={styles.loadingIcon} accessible={false}>📚</Text>
          </View>
          <ActivityIndicator 
            size="large" 
            color="#ffffff" 
            style={styles.loadingSpinner}
            accessibilityLabel="Loading academic years"
          />
          <Text style={styles.loadingTitle}>Loading Academic Years</Text>
          <Text style={styles.loadingSubtitle}>
            Please wait while we fetch your options...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (error && years.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        {renderHeader()}
        {renderError()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <FlatList
        data={years}
        keyExtractor={(item) => item.id}
        renderItem={renderYearCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
            title="Pull to refresh"
            titleColor="#667eea"
          />
        }
        accessible={true}
        accessibilityLabel="Academic years list"
      />
      
      {error && years.length > 0 && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 30,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center' as const,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  headerIconText: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#ffffff',
    textAlign: 'center' as const,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff80',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  progressContainer: {
    alignItems: 'center' as const,
    flex: 1,
  },
  progressBar: {
    width: screenWidth - 80,
    height: 4,
    backgroundColor: '#ffffff20',
    borderRadius: 2,
    overflow: 'hidden' as const,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#ffffff80',
    fontWeight: '500' as const,
  },
  yearCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  selectedCard: {
    transform: [{ scale: 0.98 }],
  },
  cardGradient: {
    borderRadius: 20,
    overflow: 'hidden' as const,
  },
  cardContent: {
    padding: 24,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff25',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  yearIcon: {
    fontSize: 24,
  },
  loadingContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff25',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  yearName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 30,
  },
  yearSubtitle: {
    fontSize: 16,
    color: '#ffffff80',
    fontWeight: '500' as const,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    marginTop: 16,
  },
  orderBadge: {
    backgroundColor: '#ffffff25',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingContent: {
    alignItems: 'center' as const,
    paddingHorizontal: 40,
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 30,
  },
  loadingIcon: {
    fontSize: 48,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#ffffff80',
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  errorBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f59e0b',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center' as const,
  },
};

export default StudentYearScreen;