import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  Platform,
  StatusBar,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Modal
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDownloadURL, ref, listAll } from 'firebase/storage';
import { storage } from '../../../utils/firebaseConfig';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get('window');

type FileItem = { 
  name: string; 
  url: string; 
  path: string;
  extension: string;
  size?: number;
};

// Mock function to simulate API call for summary
const generateSummary = async (pdfUrl: string): Promise<string> => {
  // In a real app, you would:
  // 1. Download the PDF (or send URL to your backend)
  // 2. Use an API like:
  //    - OpenAI's GPT for summarization
  //    - Hugging Face summarization models
  //    - A dedicated PDF processing API
  
  // For now, we'll return a mock summary after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`This is a generated summary of the PDF document. In a real implementation, this would contain the key points extracted from the PDF content. 

The summary might include:
- Main topics covered
- Key findings or conclusions
- Important data points
- Recommendations or action items

For now, this is just placeholder text to demonstrate the UI functionality. To implement this properly, you would need to integrate with a text processing API.`);
    }, 1500);
  });
};

const Notes = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { course, courseId, courseName } = params || {};
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [currentSummary, setCurrentSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  // Get file extension and icon
  const getFileInfo = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    let icon = '📄';
    let color = '#64748b';
    
    switch (extension) {
      case 'pdf':
        icon = '📕';
        color = '#ef4444';
        break;
      case 'doc':
      case 'docx':
        icon = '📘';
        color = '#2563eb';
        break;
      case 'ppt':
      case 'pptx':
        icon = '📙';
        color = '#f59e0b';
        break;
      case 'xls':
      case 'xlsx':
        icon = '📗';
        color = '#16a34a';
        break;
      case 'txt':
        icon = '📝';
        color = '#6b7280';
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        icon = '🖼️';
        color = '#8b5cf6';
        break;
      default:
        icon = '📄';
        color = '#64748b';
    }
    
    return { icon, color, extension };
  };

  const fetchFilesFromStorage = async () => {
    try {
      setLoading(true);
      if (!courseName) {
        Alert.alert('Error', 'Course name is missing.');
        setLoading(false);
        return;
      }

      const folderPath = `${courseName}/`;
      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);

      const fileList = await Promise.all(
        result.items.map(async (item) => {
          const downloadURL = await getDownloadURL(item);
          const extension = item.name.split('.').pop()?.toLowerCase() || '';
          
          return {
            name: item.name,
            url: downloadURL,
            path: item.fullPath,
            extension,
          };
        })
      );

      setFiles(fileList);
      console.log('Files in Folder:', fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
      Alert.alert('Error', 'Failed to fetch files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      setDownloading(fileName);
      
      if (!fileUrl) {
        Alert.alert('Error', 'File URL is missing.');
        return;
      }

      if (Platform.OS === 'web') {
        window.open(fileUrl, '_blank');
        Alert.alert('Success', `File "${fileName}" is ready to download.`);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        const { uri } = await FileSystem.downloadAsync(fileUrl, fileUri);
        console.log('File downloaded to:', uri);
        Alert.alert('Success', `File "${fileName}" downloaded successfully!`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleSummaryPress = async (file: FileItem) => {
    if (file.extension !== 'pdf') {
      Alert.alert('Info', 'Summaries are only available for PDF files.');
      return;
    }

    setSelectedFile(file);
    setSummaryModalVisible(true);
    setSummaryLoading(true);
    
    try {
      const summary = await generateSummary(file.url);
      setCurrentSummary(summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      Alert.alert('Error', 'Failed to generate summary. Please try again.');
      setCurrentSummary('Failed to generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchFilesFromStorage();
  }, [courseName]);

  const renderFileItem = ({ item }: { item: FileItem }) => {
    const { icon, color } = getFileInfo(item.name);
    const isDownloading = downloading === item.name;
    
    return (
      <View style={styles.fileCard}>
        <View style={styles.fileContent}>
          <View style={[styles.fileIcon, { backgroundColor: `${color}15` }]}>
            <Text style={styles.fileIconText}>{icon}</Text>
          </View>
          
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.fileExtension}>
              {item.extension.toUpperCase()} Document
            </Text>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
              onPress={() => handleSummaryPress(item)}
              disabled={isDownloading || item.extension !== 'pdf'}
            >
              <Text style={styles.actionButtonText}>Summary</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: color }]}
              onPress={() => downloadFile(item.url, item.name)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.actionButtonText}>Download</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>📂</Text>
      </View>
      <Text style={styles.emptyTitle}>No Notes Available</Text>
      <Text style={styles.emptySubtitle}>
        There are no study materials uploaded for this course yet.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading course materials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>Course Materials</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {courseName || 'Unknown Course'}
          </Text>
          <Text style={styles.filesCount}>
            {files.length} {files.length === 1 ? 'file' : 'files'} available
          </Text>
        </View>
      </LinearGradient>

      {/* Files List */}
      <View style={styles.content}>
        <FlatList
          data={files}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      </View>

      {/* Summary Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={summaryModalVisible}
        onRequestClose={() => {
          setSummaryModalVisible(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Summary of {selectedFile?.name || 'Document'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSummaryModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {summaryLoading ? (
              <View style={styles.summaryLoading}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.summaryLoadingText}>
                  Generating summary...
                </Text>
              </View>
            ) : (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>{currentSummary}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Notes;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'flex-start',
    marginTop: 50,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 28,
  },
  filesCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: -10,
    backgroundColor: '#f8fafc',
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  fileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  fileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fileIconText: {
    fontSize: 20,
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
    marginBottom: 4,
  },
  fileExtension: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
    lineHeight: 24,
  },
  summaryLoading: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  summaryContainer: {
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
  },
});