# ⚡ Relampo YAML Editor - Desktop App Build Guide

## 🎯 Overview

This guide explains how to build **native desktop applications** (Mac/Linux) for Relampo YAML Editor using Electron.

Instead of opening a browser, users get a **standalone desktop window** that works like a native app.

---

## 📋 Prerequisites

### Required
- **Node.js** v18+ (with npm)
- **Git** (optional, for cloning)

### Platform-Specific

**macOS:**
- macOS 10.13+ (High Sierra or later)
- Xcode Command Line Tools: `xcode-select --install`

**Linux:**
- Ubuntu 18.04+ / Debian 10+ / Fedora 30+
- Build tools: `sudo apt-get install build-essential` (Debian/Ubuntu)

---

## 🚀 Quick Start

### 1. Build Desktop App

```bash
# Make script executable
chmod +x build-yaml-desktop.sh

# Run the builder
./build-yaml-desktop.sh
```

### 2. Find Your Binaries

After the build completes, find your apps in:

```
relampo-desktop-releases/
├── mac/
│   ├── Relampo-YAML-Editor-1.0.0.dmg      # macOS installer
│   └── Relampo-YAML-Editor-1.0.0-mac.zip  # macOS portable
└── linux/
    ├── Relampo-YAML-Editor-1.0.0.AppImage # Linux portable
    └── relampo-yaml-editor-1.0.0.tar.gz   # Linux archive
```

---

## 📦 Distribution Formats

### macOS

**DMG Installer** (Recommended)
```bash
# Users double-click the .dmg and drag to Applications
Relampo-YAML-Editor-1.0.0.dmg
```

**ZIP Archive**
```bash
# Extract and move to Applications manually
Relampo-YAML-Editor-1.0.0-mac.zip
```

### Linux

**AppImage** (Recommended - Universal)
```bash
# Single executable, works on most Linux distros
chmod +x Relampo-YAML-Editor-1.0.0.AppImage
./Relampo-YAML-Editor-1.0.0.AppImage
```

**tar.gz Archive**
```bash
# Extract and run
tar -xzf relampo-yaml-editor-1.0.0.tar.gz
cd relampo-yaml-editor
./relampo-yaml-editor
```

---

## 🎨 App Features

✅ **Native Desktop Window** - No browser required
✅ **Offline Mode** - Works without internet
✅ **Dark Theme** - Professional dark UI (#0a0a0a background)
✅ **1400x900 Default Window** - Optimal for YAML editing
✅ **Resizable** - Minimum 1000x600
✅ **Cross-Platform** - macOS (Intel & Apple Silicon) + Linux

---

## 🔧 Build Process Details

The `build-yaml-desktop.sh` script performs these steps:

1. **Checks dependencies** (Node.js, npm)
2. **Backs up** your current App.tsx
3. **Switches** to AppYAMLStandalone.tsx
4. **Builds** React production bundle (`npm run build`)
5. **Restores** original App.tsx
6. **Copies** build files to electron-build/
7. **Installs** Electron dependencies
8. **Packages** app with electron-builder
9. **Moves** final binaries to relampo-desktop-releases/
10. **Cleans up** temporary files

---

## 📊 Build Sizes

Approximate sizes (may vary):

| Platform | Format | Size |
|----------|--------|------|
| macOS Intel | DMG | ~150 MB |
| macOS Apple Silicon | DMG | ~150 MB |
| macOS | ZIP | ~145 MB |
| Linux | AppImage | ~160 MB |
| Linux | tar.gz | ~140 MB |

---

## 🌐 Distribution Methods

### Option 1: GitHub Releases (Recommended)

```bash
# Create a new release
gh release create v1.0.0 \
  relampo-desktop-releases/Relampo-YAML-Editor-1.0.0.dmg \
  relampo-desktop-releases/Relampo-YAML-Editor-1.0.0.AppImage \
  --title "Relampo YAML Editor v1.0.0" \
  --notes "First desktop release"
```

### Option 2: Direct Download

Upload files to your web server:

```bash
# macOS
curl -O https://yoursite.com/downloads/Relampo-YAML-Editor-1.0.0.dmg

# Linux
curl -O https://yoursite.com/downloads/Relampo-YAML-Editor-1.0.0.AppImage
chmod +x Relampo-YAML-Editor-1.0.0.AppImage
./Relampo-YAML-Editor-1.0.0.AppImage
```

### Option 3: Cloud Storage

- Upload to Google Drive / Dropbox
- Share public download link
- Users download and install

---

## 🐛 Troubleshooting

### Build Fails on macOS

**Error:** "xcode-select: error: tool 'xcodebuild' requires Xcode"

**Solution:**
```bash
xcode-select --install
```

### Build Fails on Linux

**Error:** "error while loading shared libraries"

**Solution (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential libssl-dev
```

**Solution (Fedora):**
```bash
sudo dnf install gcc gcc-c++ make openssl-devel
```

### App Won't Open on macOS

**Error:** "App is damaged and can't be opened"

**Solution:** This happens when the app isn't signed. Right-click → Open → Open anyway.

**For Distribution:** Sign your app with an Apple Developer account.

### AppImage Won't Run on Linux

**Error:** "Permission denied"

**Solution:**
```bash
chmod +x Relampo-YAML-Editor-1.0.0.AppImage
```

---

## 🔐 Code Signing (Optional but Recommended)

### macOS Code Signing

Requires Apple Developer Account ($99/year):

```bash
# Set environment variables before building
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Then run build
./build-yaml-desktop.sh
```

### Linux Code Signing

Linux doesn't require code signing, but you can:
- Sign with GPG for verification
- Distribute checksums (SHA256)

```bash
# Generate checksum
sha256sum Relampo-YAML-Editor-1.0.0.AppImage > checksums.txt
```

---

## 📝 User Installation Instructions

### For macOS Users

1. Download `Relampo-YAML-Editor-1.0.0.dmg`
2. Double-click the DMG file
3. Drag "Relampo YAML Editor" to Applications folder
4. Open from Applications
5. (First time) Right-click → Open → Open (to bypass Gatekeeper)

### For Linux Users

**AppImage (Easiest):**
```bash
wget https://yoursite.com/Relampo-YAML-Editor-1.0.0.AppImage
chmod +x Relampo-YAML-Editor-1.0.0.AppImage
./Relampo-YAML-Editor-1.0.0.AppImage
```

**Optional:** Integrate with desktop:
```bash
# Makes it appear in applications menu
./Relampo-YAML-Editor-1.0.0.AppImage --appimage-extract
sudo mv squashfs-root/usr/share/applications/*.desktop /usr/share/applications/
```

---

## ⚙️ Advanced Configuration

### Custom Window Size

Edit `/electron/main.js`:

```javascript
const mainWindow = new BrowserWindow({
  width: 1600,  // Change this
  height: 1000, // Change this
  // ...
});
```

### Enable DevTools

Edit `/electron/main.js`:

```javascript
// Uncomment this line
mainWindow.webContents.openDevTools();
```

### Custom App Icon

Replace these files:
- `/electron/icon.icns` (macOS - 512x512)
- `/electron/icon.png` (Linux - 512x512)

---

## 🎯 What's Next?

After building, you can:

1. ✅ Test the app locally
2. ✅ Distribute to users via GitHub Releases
3. ✅ Create installers for Windows (requires electron-builder on Windows)
4. ✅ Set up auto-updates (requires additional configuration)
5. ✅ Submit to Mac App Store (requires Apple Developer account)

---

## 💡 Tips

- **First build is slow** (~5-10 min) - downloads Electron binaries
- **Subsequent builds are faster** (~1-2 min)
- **Clean builds:** `rm -rf electron-build node_modules` if issues arise
- **File size:** Electron apps are large (~150MB) but fully self-contained
- **No Python needed:** Unlike the web version, desktop app has no dependencies

---

## 🔥 Benefits Over Web Version

| Feature | Web Version | Desktop Version |
|---------|-------------|-----------------|
| Installation | Python required | Just download & run |
| Browser | Opens in browser | Native window |
| Offline | Requires local server | Fully offline |
| Performance | Depends on browser | Optimized Chromium |
| User Experience | Browser tabs | Dedicated app |
| File Size | ~5 MB | ~150 MB |

---

## 📞 Support

- **Issues:** Create GitHub issue
- **Build problems:** Check troubleshooting section
- **Feature requests:** Open discussion

---

## 📄 License

Same license as main Relampo project (MIT)

---

**Built with ⚡ by the Relampo Team**
