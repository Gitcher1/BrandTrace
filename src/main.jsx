import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installMobileImageReaderGuard } from './utils/mobileImageGuard.js';
import './styles.css';

installMobileImageReaderGuard();

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('BrandTrace UI error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="section">
          <div className="container">
            <div className="card">
              <h2>BrandTrace needs to reload this screen</h2>
              <p className="notice">
                Your local records are still stored on this device. Reload the app and continue your
                scan or photo intake.
              </p>
              <button className="button primary" type="button" onClick={() => window.location.reload()}>
                Reload BrandTrace
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
