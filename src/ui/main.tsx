import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// 规则: bundle-defer-third-party - 延迟非关键第三方库加载
// electron-log 动态导入避免阻塞初始渲染
let log: typeof import('electron-log/renderer').default | null = null;

const initLogging = async () => {
	try {
		const logModule = await import('electron-log/renderer');
		log = logModule.default;
		log.transports.console.level = 'info';
		Object.assign(console, log.functions);
	} catch (err) {
		console.error('Failed to initialize electron-log:', err);
	}
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
	if (log) {
		log.error('Unhandled Rejection:', event.reason);
	} else {
		console.error('Unhandled Rejection:', event.reason);
	}
});

// Handle global errors
window.addEventListener('error', (event) => {
	if (log) {
		log.error('Global Error:', event.error || event.message);
	} else {
		console.error('Global Error:', event.error || event.message);
	}
});

// Initialize logging after hydration
setTimeout(initLogging, 0);

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</StrictMode>
)

