import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import log from 'electron-log/renderer';
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// Hook console logging to electron-log
log.transports.console.level = 'info';
Object.assign(console, log.functions);

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
	log.error('Unhandled Rejection:', event.reason);
});

// Handle global errors
window.addEventListener('error', (event) => {
	log.error('Global Error:', event.error || event.message);
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</StrictMode>
)
