import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import Pdf from 'react-native-pdf';

export default function PdfViewerScreen({ document, onBack }) {
  const [localUri, setLocalUri] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function preparePdf() {
      try {
        const base64 = await FileSystem.StorageAccessFramework.readFile(
          document.uri,
          { encoding: 'base64' }
        );
        const target = `${FileSystem.cacheDirectory}docviewer-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(target, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (active) setLocalUri(target);
      } catch (loadError) {
        if (active) setError(loadError.message || 'The PDF could not be loaded.');
      }
    }

    preparePdf();
    return () => {
      active = false;
    };
  }, [document.uri]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#17212B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{document.name}</Text>
        <Text style={styles.page}>{pageCount ? `${page} / ${pageCount}` : ''}</Text>
      </View>
      {error ? (
        <View style={styles.message}>
          <Text style={styles.errorTitle}>Unable to open PDF</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : localUri ? (
        <Pdf
          source={{ uri: localUri }}
          style={styles.pdf}
          onPageChanged={(nextPage, totalPages) => {
            setPage(nextPage);
            setPageCount(totalPages);
          }}
          onError={(pdfError) => setError(pdfError?.message || 'The PDF could not be displayed.')}
          enablePaging
          trustAllCerts={false}
        />
      ) : (
        <View style={styles.message}>
          <ActivityIndicator size="large" color="#3D7EFF" />
          <Text style={styles.loading}>Loading PDF...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101820' },
  header: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17212B',
  },
  backButton: { paddingVertical: 10, paddingRight: 16 },
  backText: { color: '#9FC0FF', fontSize: 15, fontWeight: '700' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  page: { minWidth: 55, color: '#B8C3D1', textAlign: 'right', fontSize: 13 },
  pdf: { flex: 1, backgroundColor: '#101820' },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loading: { marginTop: 14, color: '#B8C3D1', fontSize: 15 },
  errorTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  errorText: { marginTop: 8, color: '#B8C3D1', textAlign: 'center', fontSize: 14 },
});