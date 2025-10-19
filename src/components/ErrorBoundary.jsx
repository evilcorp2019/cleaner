import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#1a1a2e',
          color: '#fff'
        }}>
          <div style={{
            maxWidth: '600px',
            padding: '40px',
            backgroundColor: '#16213e',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <h1 style={{ color: '#e94560', marginBottom: '20px' }}>
               Application Error
            </h1>
            <p style={{ fontSize: '18px', marginBottom: '20px', lineHeight: '1.6' }}>
              This application must be run as a desktop application, not directly in a web browser.
            </p>
            <div style={{
              backgroundColor: '#1a1a2e',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <p style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '14px' }}>
                <strong>To run the app correctly:</strong>
              </p>
              <p style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '14px' }}>
                $ npm run dev
              </p>
              <p style={{ margin: '5px 0', fontFamily: 'monospace', fontSize: '14px', color: '#888' }}>
                (This will open the application window)
              </p>
            </div>
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#0f3460' }}>
                Technical Details
              </summary>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#0f0f0f',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                color: '#e94560'
              }}>
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
