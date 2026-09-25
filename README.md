# DocViewer (React Native / Expo)

Browse a folder of documents on your Android phone — PDF, Word, PowerPoint,
Excel, and text files — and open each one with search-and-hand-off to
whatever app you have installed.

## Why this version is built differently from the Kotlin one

The native Kotlin app crashed on launch and we couldn't get a stack trace to
fix it. This rewrite deliberately avoids every native-code dependency:

- **No native PDF renderer, no native "open with" module.** Every document —
  PDF included — is handed to the system via `Linking.openURL(uri)`, the same
  mechanism a file manager uses. Android resolves the right app (or shows a
  chooser) automatically from the file's content URI.
- **Only one library:** `expo-file-system`, which is bundled with Expo Go
  itself. There is no `android/` folder, no Gradle, nothing to misconfigure.

The trade-off: no in-app PDF page viewer with pinch-zoom like the Kotlin
version had — PDFs open in whatever PDF app you have (Chrome, Google Drive,
Adobe Acrobat, etc.), same as tapping a PDF anywhere else on your phone.

## Try it in ~2 minutes (no build at all)

1. Install **Expo Go** from the Play Store on your phone.
2. On your computer: unzip this project, then in the folder run:
   ```
   npm install
   npx expo install react react-native expo-file-system
   npx expo start
   ```
3. A QR code appears in the terminal. Scan it with the **Expo Go** app (or
   the Camera app, which will offer to open it in Expo Go).
4. The app loads on your phone directly — no APK, no install step. This is
   the fastest way to confirm it actually works before building anything.

Your computer and phone need to be on the same Wi-Fi network for this step.

## Building a real, installable APK

Once you've confirmed it works in Expo Go, get a standalone APK via Expo's
free cloud build service (EAS) — still no local Android SDK required:

```
npm install -g eas-cli
eas login          # free Expo account
eas build --platform android --profile preview
```

This uploads your project and builds the APK on Expo's servers; when it
finishes it gives you a download link.

### Doing this from GitHub Actions instead

The included `.github/workflows/build.yml` does the same EAS build
automatically on every push:

1. Create a free account at expo.dev, then run `eas login` locally once to
   confirm it, or generate a token from your Expo account's access-token
   settings page.
2. In your GitHub repo → **Settings → Secrets and variables → Actions** →
   add a secret named `EXPO_TOKEN` with that token.
3. Push the project to GitHub → **Actions** tab → the build runs → when it
   finishes, check the **eas.dev** build link printed in the log (EAS builds
   aren't stored as GitHub artifacts — they live on your Expo account's
   dashboard at expo.dev/accounts/<you>/projects/docviewer/builds).

## Known limitation

The folder you pick isn't remembered between app restarts (SAF permission
still exists — the app just doesn't re-select it automatically). Easy to add
later with `@react-native-async-storage/async-storage` if you want that.
