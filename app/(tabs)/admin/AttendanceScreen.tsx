import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { collection, getDocs, db } from '@/utils/firebaseConfig';
import { useRoute } from '@react-navigation/native';

interface Student {
  studentName: string;
  status: string;
  in: number;
}

interface Attendance {
  id: string;
  date: string;
  students: Student[];
}

const AttendanceScreen: React.FC = () => {
  const route = useRoute();
  const { yearId, semesterId, courseId } = route.params as { yearId: string, semesterId: string, courseId: string };

  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const attendanceSnapshot = await getDocs(
        collection(db, 'years', yearId, 'semesters', semesterId, 'courses', courseId, 'attendance')
      );
      const attendanceList = attendanceSnapshot.docs.map(doc => {
        const data = doc.data() as Attendance;
        return { id: doc.id, ...data };
      });

      setAttendanceRecords(attendanceList);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [yearId, semesterId, courseId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Records</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (
        <FlatList
          data={attendanceRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recordContainer}>
              <TouchableOpacity onPress={() => setExpandedDate(expandedDate === item.date ? null : item.date)}>
                <Text style={styles.date}>{item.date}</Text>
              </TouchableOpacity>

              {expandedDate === item.date && (
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

      <TouchableOpacity style={styles.refreshButton} onPress={fetchAttendance}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  recordContainer: { marginBottom: 20, padding: 10, borderRadius: 8, backgroundColor: '#fff', elevation: 2 },
  date: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#007BFF' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#007BFF', paddingVertical: 8, borderRadius: 4 },
  headerCell: { fontWeight: 'bold', color: 'white' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 8 },
  cell: { flex: 1, textAlign: 'center', fontSize: 16, paddingHorizontal: 5 },
  refreshButton: { backgroundColor: '#007BFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  refreshText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
});

export default AttendanceScreen;
