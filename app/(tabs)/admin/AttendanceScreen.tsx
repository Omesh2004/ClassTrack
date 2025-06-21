import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  TouchableOpacity, 
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl
} from 'react-native';
import { getFirestore, collectionGroup, getDocs } from 'firebase/firestore';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';

interface Student {
  studentName: string;
  status: string;
  in: number;
}

interface Session {
  id: string;
  classTime: string;
  date: string;
  students: Student[];
  delT: string;
}

const AttendanceScreen: React.FC = () => {
  // Use useLocalSearchParams for Expo Router
  const params = useLocalSearchParams();
  const { courseId, yearName, semesterName, courseName } = params as {
    courseId: string;
    yearName: string;
    semesterName: string;
    courseName: string;
  };

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const db = getFirestore();

  const fetchSessions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      console.log(`Fetching attendance sessions for course: ${courseId}`);
      const sessionsRef = collectionGroup(db, 'sessions');
      const sessionSnapshot = await getDocs(sessionsRef);
      
      const records: Session[] = [];
      sessionSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.courseId === courseId) {
          records.push({
            id: doc.id,
            date: data.date || 'Unknown Date',
            classTime: data.classTime || 'Unknown Time',
            students: data.students || [],
            delT: data.delT || 'Unknown Time',
          });
        }
      });

      const sortedRecords = records.sort((a, b) => (a.date > b.date ? -1 : 1));
      console.log('Fetched Sessions:', sortedRecords);
      setSessions(sortedRecords);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setErrorMessage('Failed to fetch attendance data.');
      Alert.alert('Error', 'Failed to fetch attendance data. Please try again.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const downloadAsExcel = async (session: Session) => {
    try {
      const worksheetData = [
        ['Student Name', 'Status', 'In'],
        ...session.students.map(student => [student.studentName, student.status, student.in])
      ];

      const worksheet = utils.aoa_to_sheet(worksheetData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Attendance');

      const excelBuffer = write(workbook, { type: 'binary', bookType: 'xlsx' });

      if (Platform.OS !== 'web') {
        const fileUri = FileSystem.cacheDirectory + `${session.date}_attendance.xlsx`;

        await FileSystem.writeAsStringAsync(fileUri, excelBuffer, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Download Attendance',
          UTI: 'com.microsoft.excel.xlsx',
        });
      }
      
      Alert.alert('Success', 'Attendance data exported successfully!');
    } catch (error) {
      console.error('Error exporting file:', error);
      Alert.alert('Error', 'Failed to export attendance data.');
    }
  };

  const getAttendanceStats = (students: Student[]) => {
    const present = students.filter(s => s.status === 'Present').length;
    const total = students.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, total, percentage };
  };

  const goBack = () => {
    router.back();
  };

  const renderSessionItem = ({ item }: { item: Session }) => {
    const isExpanded = expandedSessions.has(item.id);
    const stats = getAttendanceStats(item.students);

    return (
      <View style={styles.sessionCard}>
        <TouchableOpacity 
          style={styles.sessionHeader}
          onPress={() => toggleSessionExpansion(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sessionInfo}>
            <Text style={styles.dateText}>{item.date}</Text>
            <Text style={styles.timeText}>Class Time: {item.delT}</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statsBadge}>
                <Text style={styles.statsText}>
                  {stats.present}/{stats.total} Present ({stats.percentage}%)
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.expandIcon}>
            <Text style={styles.expandText}>{isExpanded ? '▼' : '▶'}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sessionDetails}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameColumn]}>Student Name</Text>
                <Text style={[styles.headerCell, styles.statusColumn]}>Status</Text>
                <Text style={[styles.headerCell, styles.timeColumn]}>Time</Text>
              </View>
              
              {item.students.map((student, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.tableRow,
                    student.status === 'Present' ? styles.presentRow : styles.absentRow
                  ]}
                >
                  <Text style={[styles.cell, styles.nameColumn]}>{student.studentName}</Text>
                  <View style={[styles.statusCell, styles.statusColumn]}>
                    <View style={[
                      styles.statusBadge,
                      student.status === 'Present' ? styles.presentBadge : styles.absentBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        student.status === 'Present' ? styles.presentText : styles.absentText
                      ]}>
                        {student.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cell, styles.timeColumn]}>{student.in}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.exportButton} 
              onPress={() => downloadAsExcel(item)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#10b981', '#059669']} style={styles.exportButtonGradient}>
                <Text style={styles.exportButtonText}>📊 Export to Excel</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    if (courseId) {
      fetchSessions();
    }
  }, [courseId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
        <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading attendance sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      
      {/* Header */}
      <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Sessions</Text>
        <Text style={styles.headerSubtitle}>
          {courseName} • {semesterName} • {yearName}
        </Text>
        <Text style={styles.sessionCount}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
        </Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.container}>
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Error Loading Data</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchSessions()}>
              <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.retryButtonGradient}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Sessions Found</Text>
            <Text style={styles.emptyText}>
              No attendance sessions are available for this course yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSessionItem}
            style={styles.sessionsList}
            contentContainerStyle={styles.sessionsContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchSessions(true)}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 4,
  },
  sessionCount: {
    fontSize: 14,
    color: '#e0e7ff',
    textAlign: 'center',
    opacity: 0.8,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  sessionsList: {
    flex: 1,
  },
  sessionsContent: {
    padding: 20,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  sessionInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  expandIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  sessionDetails: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  presentRow: {
    backgroundColor: '#f0fdf4',
  },
  absentRow: {
    backgroundColor: '#fef2f2',
  },
  cell: {
    fontSize: 14,
    color: '#374151',
  },
  nameColumn: {
    flex: 2,
  },
  statusColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeColumn: {
    flex: 1,
    textAlign: 'center',
  },
  statusCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  presentBadge: {
    backgroundColor: '#dcfce7',
  },
  absentBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presentText: {
    color: '#166534',
  },
  absentText: {
    color: '#dc2626',
  },
  exportButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AttendanceScreen;