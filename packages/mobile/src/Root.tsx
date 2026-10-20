import React from 'react';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

export default function Root(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
