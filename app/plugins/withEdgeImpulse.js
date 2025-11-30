const {
  withAppBuildGradle,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for Edge Impulse Module
 * Ensures proper integration with New Architecture
 */
function withEdgeImpulse(config) {
  // Add EdgeImpulsePackage to MainApplication.kt
  config = withMainApplication(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Add import if not present
    if (!contents.includes('import com.sanesoluti.eco5000.EdgeImpulsePackage')) {
      const importInsertPoint = contents.lastIndexOf('import expo.modules.ReactNativeHostWrapper');
      if (importInsertPoint !== -1) {
        contents =
          contents.slice(0, importInsertPoint) +
          'import expo.modules.ReactNativeHostWrapper\n\n' +
          'import com.sanesoluti.eco5000.EdgeImpulsePackage\n' +
          contents.slice(importInsertPoint + 'import expo.modules.ReactNativeHostWrapper'.length);
      }
    }

    // Add package to getPackages() if not present
    if (!contents.includes('add(EdgeImpulsePackage())')) {
      const packagesInsertPoint = contents.indexOf('// add(MyReactNativePackage())');
      if (packagesInsertPoint !== -1) {
        contents =
          contents.slice(0, packagesInsertPoint) +
          '// add(MyReactNativePackage())\n              add(EdgeImpulsePackage())\n' +
          contents.slice(packagesInsertPoint + '// add(MyReactNativePackage())'.length);
      }
    }

    modResults.contents = contents;
    return config;
  });

  // Ensure build.gradle has CMake and packaging configuration
  config = withAppBuildGradle(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Add CMake configuration if not present
    if (!contents.includes('externalNativeBuild')) {
      const androidBlockMatch = contents.match(/android\s*{/);
      if (androidBlockMatch) {
        const insertPoint = androidBlockMatch.index + androidBlockMatch[0].length;
        contents =
          contents.slice(0, insertPoint) +
          '\n    ndkVersion rootProject.ext.ndkVersion\n' +
          '\n    buildToolsVersion rootProject.ext.buildToolsVersion\n' +
          '    compileSdk rootProject.ext.compileSdkVersion\n' +
          '\n    namespace \'com.sanesoluti.eco5000\'\n' +
          '\n    externalNativeBuild {\n' +
          '        cmake {\n' +
          '            path "src/main/cpp/CMakeLists.txt"\n' +
          '            version "3.22.1"\n' +
          '        }\n' +
          '    }\n' +
          contents.slice(insertPoint);
      }
    }

    // Add externalNativeBuild to defaultConfig if not present
    if (!contents.includes('externalNativeBuild') ||
        !contents.match(/defaultConfig\s*{[\s\S]*externalNativeBuild/)) {
      const defaultConfigMatch = contents.match(/defaultConfig\s*{/);
      if (defaultConfigMatch) {
        // Find the closing brace of buildConfigField
        const buildConfigField = contents.indexOf('buildConfigField', defaultConfigMatch.index);
        if (buildConfigField !== -1) {
          const insertPoint = contents.indexOf('\n', buildConfigField + 100);
          if (insertPoint !== -1) {
            contents =
              contents.slice(0, insertPoint) +
              '\n\n        externalNativeBuild {\n' +
              '            cmake {\n' +
              '                cppFlags "-std=c++14 -fexceptions -frtti -O3"\n' +
              '                arguments "-DANDROID_STL=c++_shared"\n' +
              '            }\n' +
              '        }\n' +
              '        ndk {\n' +
              '            abiFilters \'armeabi-v7a\', \'arm64-v8a\', \'x86\', \'x86_64\'\n' +
              '        }\n' +
              contents.slice(insertPoint);
          }
        }
      }
    }

    // Add STL conflict resolution to packagingOptions if not present
    if (!contents.includes('pickFirst \'**/libc++_shared.so\'')) {
      const packagingOptionsMatch = contents.match(/packagingOptions\s*{/);
      if (packagingOptionsMatch) {
        const jniLibsMatch = contents.indexOf('}', packagingOptionsMatch.index);
        if (jniLibsMatch !== -1) {
          contents =
            contents.slice(0, jniLibsMatch) +
            '        }\n' +
            '        // Fix STL conflicts between React Native and Edge Impulse SDK\n' +
            '        pickFirst \'**/libc++_shared.so\'\n' +
            '        pickFirst \'**/libfbjni.so\'\n' +
            contents.slice(jniLibsMatch + 1);
        }
      }
    }

    modResults.contents = contents;
    return config;
  });

  // Copy C++ files during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidProjectRoot = config.modRequest.platformProjectRoot;

      // Helper function to copy files recursively
      const copyRecursive = (src, dest) => {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          const files = fs.readdirSync(src);
          files.forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };

      // Copy C++ files
      const cppSourceDir = path.join(projectRoot, 'native', 'cpp');
      const cppDestDir = path.join(androidProjectRoot, 'app', 'src', 'main', 'cpp');

      if (fs.existsSync(cppSourceDir)) {
        console.log('[EdgeImpulse Plugin] Copying C++ files from native/cpp to android/app/src/main/cpp...');
        if (!fs.existsSync(cppDestDir)) {
          fs.mkdirSync(cppDestDir, { recursive: true });
        }
        copyRecursive(cppSourceDir, cppDestDir);
        console.log('[EdgeImpulse Plugin] C++ files copied successfully!');
      } else {
        console.warn('[EdgeImpulse Plugin] Warning: native/cpp directory not found, skipping C++ file copy');
      }

      // Copy Kotlin files
      const kotlinSourceDir = path.join(projectRoot, 'native', 'kotlin');
      const kotlinDestDir = path.join(androidProjectRoot, 'app', 'src', 'main', 'java', 'com', 'sanesoluti', 'eco5000');

      if (fs.existsSync(kotlinSourceDir)) {
        console.log('[EdgeImpulse Plugin] Copying Kotlin files from native/kotlin to android/app/src/main/java/com/sanesoluti/eco5000...');
        if (!fs.existsSync(kotlinDestDir)) {
          fs.mkdirSync(kotlinDestDir, { recursive: true });
        }
        copyRecursive(kotlinSourceDir, kotlinDestDir);
        console.log('[EdgeImpulse Plugin] Kotlin files copied successfully!');
      } else {
        console.warn('[EdgeImpulse Plugin] Warning: native/kotlin directory not found, skipping Kotlin file copy');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withEdgeImpulse;
