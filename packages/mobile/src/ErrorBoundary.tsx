import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

// Top-level safety net: in a release build an uncaught render error is fatal and
// closes the app, so show a recoverable screen instead.
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>SOMETHING WENT WRONG</Text>
        <Text style={styles.message} numberOfLines={6}>{error.message}</Text>
        <TouchableOpacity style={styles.btn} activeOpacity={0.7} onPress={() => this.setState({ error: null })}>
          <Text style={styles.btnText}>↻  TRY AGAIN</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06080F', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#FFD866', fontSize: 20, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  message: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 12, textAlign: 'center' },
  btn: { marginTop: 32, paddingVertical: 14, paddingHorizontal: 36, backgroundColor: '#4A6CF7', borderRadius: 13 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});
