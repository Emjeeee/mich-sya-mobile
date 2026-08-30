import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pixel } from '../components/ui/pixel-icons';
import { friendlyError } from '../lib/friendlyError';
import { supabase } from '../lib/supabase';
import { artDeco } from '../theme/artDecoTokens';
import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
import { useAppTheme } from '../theme/ThemeContext';

export default function SignInScreen() {
  const { isArtDeco } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(friendlyError(signInError.message));
      } else {
        Keyboard.dismiss();
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, isArtDeco && deco.flex]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      {isArtDeco && <ArtDecoBackground />}
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, isArtDeco && deco.title]}>MichSya</Text>
        <Text style={[styles.subtitle, isArtDeco && deco.subtitle]}>Masuk dengan akun kalian</Text>

        <TextInput
          style={[styles.input, isArtDeco && deco.input]}
          placeholder="Email"
          placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <View style={[styles.passwordRow, isArtDeco && deco.passwordRow]}>
          <TextInput
            style={[styles.passwordInput, isArtDeco && deco.passwordInput]}
            placeholder="Kata sandi"
            placeholderTextColor={isArtDeco ? artDeco.color.faint : '#767676'}
            // A hand-rolled "mask all but the last typed character" scheme
            // used to live here, reconstructing the real password from the
            // *length delta* between renders -- it only worked for a plain
            // append/backspace-at-the-end edit. Selecting-all-and-retyping
            // the same length, autofill, or editing mid-string all left the
            // displayed text and the real `password` state silently
            // diverged (could sign in with a stale password, or corrupt it
            // entirely). secureTextEntry is the native, byte-for-byte-
            // correct way to mask input regardless of how it's edited.
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={8}
          >
            <Pixel
              name={showPassword ? 'eyeOff' : 'eye'}
              size={20}
              color={isArtDeco ? artDeco.color.gold : '#666'}
            />
          </Pressable>
        </View>

        {error ? <Text style={[styles.error, isArtDeco && deco.error]}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled, isArtDeco && deco.button]}
          onPress={handleSignIn}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <ActivityIndicator color={isArtDeco ? artDeco.color.black : '#fff'} />
          ) : (
            <Text style={[styles.buttonText, isArtDeco && deco.buttonText]}>Masuk</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    color: '#e11d74',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: '#e11d74',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#c0392b',
    marginBottom: 8,
    textAlign: 'center',
  },
});

const deco = StyleSheet.create({
  flex: {
    backgroundColor: 'transparent',
  },
  title: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.display,
    letterSpacing: artDeco.letterSpacingWide,
  },
  subtitle: {
    color: artDeco.color.muted,
    fontFamily: artDeco.font.serifRegular,
  },
  input: {
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface,
    color: artDeco.color.ink,
  },
  passwordRow: {
    borderColor: artDeco.color.line,
    borderRadius: artDeco.radius.none,
    backgroundColor: artDeco.color.surface,
  },
  passwordInput: {
    color: artDeco.color.ink,
  },
  button: {
    backgroundColor: artDeco.color.gold,
    borderRadius: artDeco.radius.none,
  },
  buttonText: {
    color: artDeco.color.black,
    fontFamily: artDeco.font.serifBold,
    letterSpacing: artDeco.letterSpacingWide,
  },
  error: {
    color: artDeco.color.stop,
  },
});
