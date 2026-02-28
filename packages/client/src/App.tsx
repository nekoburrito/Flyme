import { Routes, Route } from 'react-router-dom';

// Feature pages — add as they are implemented
// import SearchPage from './features/search/SearchPage.js';
// import TransfersPage from './features/transfers/TransfersPage.js';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Flyme</h1>
      <p>{title} — coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlaceholderPage title="Search" />} />
      <Route path="/transfers" element={<PlaceholderPage title="Transfer Advisor" />} />
      <Route path="*" element={<PlaceholderPage title="404 Not Found" />} />
    </Routes>
  );
}
