import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import GeoSectorMap from './components/GeoSectorMap';
import CrossCameraTracker from './components/CrossCameraTracker';
import Analytics from './pages/Analytics';
import EventHistory from './pages/EventHistory';
import DecisionCenter from './pages/DecisionCenter';
import MissionCenter from './pages/MissionCenter';
import DigitalTwin from './pages/DigitalTwin';
import Settings from './pages/Settings';
import FederatedCommand from './pages/FederatedCommand';
import SecurityCenter from './pages/SecurityCenter';
import EventDetailsModal from './components/EventDetailsModal';
import RedTeamModal from './components/RedTeamModal';
import ShiftHandoverModal from './components/ShiftHandoverModal';
import Login from './pages/Login';
import { getAuthToken, clearAuth } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [activeTab, setActiveTab] = useState('missions');
  const [focusedCameraId, setFocusedCameraId] = useState('CAM-01');
  const [inspectEventId, setInspectEventId] = useState(null);
  const [isRedTeamOpen, setIsRedTeamOpen] = useState(false);
  const [isShiftHandoverOpen, setIsShiftHandoverOpen] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!getAuthToken());
  }, []);

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const handleSelectCameraFromMap = (cameraId) => {
    setFocusedCameraId(cameraId);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-soc-900 flex flex-col overflow-hidden text-slate-100">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRedTeam={() => setIsRedTeamOpen(true)}
        onOpenShiftHandover={() => setIsShiftHandoverOpen(true)}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'dashboard' && (
          <Dashboard initialCameraId={focusedCameraId} />
        )}
        {activeTab === 'missions' && (
          <MissionCenter
            onSelectEvent={(id) => setInspectEventId(id)}
            onInspectJourney={() => setActiveTab('journey')}
            onLogout={handleLogout}
          />
        )}
        {activeTab === 'federation' && (
          <FederatedCommand onSelectEvent={(id) => setInspectEventId(id)} />
        )}
        {activeTab === 'security' && (
          <SecurityCenter />
        )}
        {activeTab === 'map' && (
          <GeoSectorMap onSelectCameraAndFocus={handleSelectCameraFromMap} />
        )}
        {activeTab === 'journey' && (
          <CrossCameraTracker onSelectEvent={(id) => setInspectEventId(id)} />
        )}

        {activeTab === 'decision' && (
          <DecisionCenter
            onSelectEvent={(id) => setInspectEventId(id)}
            onInspectJourney={() => setActiveTab('journey')}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'twin' && (
          <DigitalTwin />
        )}
        {activeTab === 'analytics' && (
          <Analytics />
        )}
        {activeTab === 'events' && (
          <EventHistory />
        )}
        {activeTab === 'settings' && (
          <Settings />
        )}
      </main>

      {/* Global Event Details Modal */}
      {inspectEventId && (
        <EventDetailsModal
          eventId={inspectEventId}
          isOpen={!!inspectEventId}
          onClose={() => setInspectEventId(null)}
        />
      )}

      {/* AI Red-Team Intrusion Simulator Modal */}
      {isRedTeamOpen && (
        <RedTeamModal
          isOpen={isRedTeamOpen}
          onClose={() => setIsRedTeamOpen(false)}
        />
      )}

      {/* Official SSB Shift Handover Report Modal */}
      {isShiftHandoverOpen && (
        <ShiftHandoverModal
          isOpen={isShiftHandoverOpen}
          onClose={() => setIsShiftHandoverOpen(false)}
        />
      )}
    </div>
  );
}
