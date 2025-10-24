
import React, { useState } from 'react';
import ExerciseSolver from './components/ExerciseSolver';
import LiveConversation from './components/LiveConversation';
import WebSearch from './components/WebSearch';
import Tabs from './components/ui/Tabs';

type Tab = 'solver' | 'live' | 'search';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('solver');

  const tabs = [
    { id: 'solver' as Tab, label: 'Exercise Solver' },
    { id: 'live' as Tab, label: 'Live Conversation' },
    { id: 'search' as Tab, label: 'Web Search' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'solver':
        return <ExerciseSolver />;
      case 'live':
        return <LiveConversation />;
      case 'search':
        return <WebSearch />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Gemini Scholar Pro
          </h1>
          <p className="mt-2 text-gray-400">Your AI-powered academic assistant</p>
        </header>
        
        <main className="bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-6">
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="mt-6">
            {renderContent()}
          </div>
        </main>

        <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
