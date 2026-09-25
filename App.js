import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const SAF = FileSystem.StorageAccessFramework;

// Extensions we treat as "documents" when scanning a folder.
const SUPPORTED_EXT = [
  'pdf', 'doc', 'docx', 'rtf', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'md',
];

const ICONS = {
  pdf: '📕',
  doc: '📘', docx: '📘', rtf: '📘',
  ppt: '📙', pptx: '📙',
  xls: '📗', xlsx: '📗', csv: '📗',
  txt: '📄', md: '📄',
};

const MAX_ENTRIES = 3000; // safety cap so a huge tree can't hang the scan
const MAX_DEPTH = 12;

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

export default function App() {
  const [rootUri, setRootUri] = useState(null);
  const [allDocs, setAllDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Recursively walk a SAF tree. We can't ask "is this a directory?" directly,
  // so we try to read it as one — if that fails, it's a file.
  const walk = useCallback(async (uri, out, depth) => {
    if (depth > MAX_DEPTH || out.length >= MAX_ENTRIES) return;

    let entries;
    try {
      entries = await SAF.readDirectoryAsync(uri);
    } catch (e) {
      return; // not a directory, or permission revoked
    }

    for (const entryUri of entries) {
      if (out.length >= MAX_ENTRIES) return;

      let subEntries = null;
      try {
        subEntries = await SAF.readDirectoryAsync(entryUri);
      } catch (e) {
        subEntries = null; // it's a file, not a folder
      }

      if (subEntries !== null) {
        await walk(entryUri, out, depth + 1);
      } else {
        const rawName = entryUri.split('/').pop() || entryUri;
        let name = rawName;
        try {
          name = decodeURIComponent(rawName);
        } catch (e) {
          // leave name as-is if it wasn't URI-encoded
        }
        const ext = extOf(name);
        if (SUPPORTED_EXT.includes(ext)) {
          out.push({ uri: entryUri, name, ext });
        }
      }
    }
  }, []);

  const scanFolder = useCallback(async (uri) => {
    setLoading(true);
    try {
      const found = [];
      await walk(uri, found, 0);
      found.sort((a, b) => a.name.localeCompare(b.name));
      setAllDocs(found);
    } catch (e) {
      Alert.alert('Could not read folder', String((e && e.message) || e));
    } finally {
      setLoading(false);
    }
  }, [walk]);

  const pickFolder = async () => {
    try {
      const perm = await SAF.requestDirectoryPermissionsAsync();
      if (!perm.granted) return;
      setRootUri(perm.directoryUri);
      await scanFolder(perm.directoryUri);
    } catch (e) {
      Alert.alert('Could not open folder picker', String((e && e.message) || e));
    }
  };

  const openDoc = async (doc) => {
    try {
      // Passing the SAF content:// uri straight to the system — Android
      // resolves the right app (or shows a chooser) using the uri's own
      // declared mime type, same as tapping a file in any file manager.
      await Linking.openURL(doc.uri);
    } catch (e) {
      Alert.alert(
        'No app found',
        `No app installed on this phone can open .${doc.ext} files.`
      );
    }
  };

  const filtered = query
    ? allDocs.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
    : allDocs;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#2E5AAC" />

      <View style={styles.header}>
        <Text style={styles.title}>DocViewer</Text>
        <TouchableOpacity style={styles.folderBtn} onPress={pickFolder}>
          <Text style={styles.folderBtnText}>
            {rootUri ? 'Change folder' : 'Choose folder'}
          </Text>
        </TouchableOpacity>
      </View>

      {!!rootUri && (
        <TextInput
          style={styles.search}
          placeholder="Search documents"
          placeholderTextColor="#8A8F98"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      )}

      {!rootUri && !loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Pick a folder to browse its PDF, Word, PowerPoint, Excel and text
            files.
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Scanning…</Text>
        </View>
      )}

      {!loading && !!rootUri && filtered.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {allDocs.length === 0
              ? 'No supported documents found in this folder.'
              : 'No files match your search.'}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.uri}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openDoc(item)}>
            <Text style={styles.icon}>{ICONS[item.ext] || '📄'}</Text>
            <View style={styles.rowText}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta}>{item.ext.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#2E5AAC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  folderBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  folderBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  search: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F1F2F4',
    borderRadius: 10,
    fontSize: 15,
    color: '#1A1A1A',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#8A8F98', fontSize: 15, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F4',
  },
  icon: { fontSize: 28, width: 40 },
  rowText: { flex: 1, marginLeft: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  meta: { fontSize: 12, color: '#8A8F98', marginTop: 2 },
});
