const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');

const PACKAGE_PATH = 'com/michsya/mobile';
const EXPO_FCM_SERVICE = 'expo.modules.notifications.service.ExpoFirebaseMessagingService';
// Matches the version expo-notifications itself depends on (android/build.gradle) --
// that dependency is `implementation`, not `api`, so it isn't visible to our
// app module's Kotlin sources without redeclaring it here.
const FIREBASE_MESSAGING_VERSION = '25.0.1';

// Copies our custom Kotlin sources (kept in android-native/, since this
// project has no committed android/ folder -- prebuild regenerates it every
// build) into the generated native project.
function withCopyRingNativeSources(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const srcDir = path.join(config.modRequest.projectRoot, 'android-native');
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        PACKAGE_PATH
      );
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of fs.readdirSync(srcDir)) {
        if (file.endsWith('.kt')) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }
      return config;
    },
  ]);
}

// Overrides expo-notifications' default FirebaseMessagingService with our
// subclass, using the standard Android manifest-merge technique for
// replacing a library-contributed component: remove the library's node by
// its exact name, then declare our own for the same intent-filter.
function withRingManifestChanges(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    AndroidConfig.Manifest.ensureToolsAvailable(manifest);
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!application.service) application.service = [];

    application.service.push({
      $: {
        'android:name': EXPO_FCM_SERVICE,
        'tools:node': 'remove',
      },
    });

    application.service.push({
      $: {
        'android:name': '.RingAwareFirebaseMessagingService',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
        },
      ],
    });

    application.service.push({
      $: {
        'android:name': '.RingForegroundService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'mediaPlayback',
      },
    });

    return config;
  });
}

function withFirebaseMessagingDependency(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('com.google.firebase:firebase-messaging')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {\n    implementation 'com.google.firebase:firebase-messaging:${FIREBASE_MESSAGING_VERSION}'`
      );
    }
    return config;
  });
}

module.exports = function withRingForegroundService(config) {
  config = withCopyRingNativeSources(config);
  config = withRingManifestChanges(config);
  config = withFirebaseMessagingDependency(config);
  return config;
};
