import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { getFirestore, collectionGroup, getDocs } from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';

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
  const route = useRoute();
  const { courseId } = route.params as { courseId: string };

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const db = getFirestore();

  const fetchSessions = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [courseId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Sessions</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : sessions.length === 0 ? (
        <Text style={styles.errorText}>No data available.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recordContainer}>
              <TouchableOpacity onPress={() => setSelectedDate(selectedDate === item.date ? null : item.date)}>
                <Text style={styles.date}>{item.date}</Text>
              </TouchableOpacity>

              {selectedDate === item.date && (
                <TouchableOpacity onPress={() => setSelectedSession(selectedSession === item.id ? null : item.id)}>
                  <Text style={styles.sessionTime}>{`Class Time: ${item.delT}`}</Text>
                </TouchableOpacity>
              )}

              {selectedSession === item.id && (
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.cell, styles.headerCell]}>Student Name</Text>
                    <Text style={[styles.cell, styles.headerCell]}>Status</Text>
                    <Text style={[styles.cell, styles.headerCell]}>In</Text>
                  </View>
                  {item.students.map((student, index) => (
                    <View key={index} style={styles.row}>
                      <Text style={styles.cell}>{student.studentName}</Text>
                      <Text style={styles.cell}>{student.status}</Text>
                      <Text style={styles.cell}>{student.in}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchSessions}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginTop: 20 },
  recordContainer: { marginBottom: 20, padding: 10, borderRadius: 8, backgroundColor: '#fff', elevation: 2 },
  date: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#007BFF' },
  sessionTime: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#007BFF', paddingVertical: 8, borderRadius: 4 },
  headerCell: { fontWeight: 'bold', color: 'white' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 8 },
  cell: { flex: 1, textAlign: 'center', fontSize: 16, paddingHorizontal: 5 },
  refreshButton: { backgroundColor: '#007BFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  refreshText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
});

export default AttendanceScreen;
