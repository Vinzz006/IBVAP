import React, { useState, useEffect } from 'react';
import CameraSelector from '../components/CameraSelector';
import LiveCameraFeed from '../components/LiveCameraFeed';
import MultiCameraGrid from '../components/MultiCameraGrid';
import AlertPanel from '../components/AlertPanel';
import DiagnosticsBar from '../components/DiagnosticsBar';
import VirtualZoneEditor from '../components/VirtualZoneEditor';
import EventDetailsModal from '../components/EventDetailsModal';
import StreamSourceModal from '../components/StreamSourceModal';
import DispatchModal from '../components/DispatchModal';
import DroneReconModal from '../components/DroneReconModal';
import { api } from '../services/api';
import { wsService } from '../services/websocket';

export default function Dashboard({ initialCameraId = 'CAM-01' }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(initialCameraId);
  const [alerts, setAlerts] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState('focus'); // 'focus' | 'quad'

  // Modals state
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isDroneReconOpen, setIsDroneReconOpen] = useState(false);
  const [inspectEventId, setInspectEventId] = useState(null);
  const [dispatchAlert, setDispatchAlert] = useState(null);

  useEffect(() => {
    if (initialCameraId) {
      setSelectedCameraId(initialCameraId);
    }
  }, [initialCameraId]);

  useEffect(() => {
    loadInitialData();

    // Connect WebSocket
    wsService.connect();
    const unsubscribe = wsService.subscribe((payload) => {
      if (payload.type === 'SECURITY_ALERT') {
        const newAlert = payload.data;
        setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
        fetchStats();
      } else if (payload.type === 'TELEMETRY_UPDATE') {
        updateCameraTelemetry(payload.data);
      }
    });

    // Regular polling for system stats every 4s
    const statsInterval = setInterval(fetchStats, 4000);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [cams, evts, stats] = await Promise.all([
        api.getCameras(),
        api.getEvents({ limit: 30 }),
        api.getSystemStats()
      ]);

      setCameras(cams);
      if (cams.length > 0 && !selectedCameraId) {
        setSelectedCameraId(cams[0].id);
      }
      setAlerts(evts.events || []);
      setSystemStats(stats);
    } catch (err) {
      console.error('Failed to load initial dashboard data:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const stats = await api.getSystemStats();
      setSystemStats(stats);
    } catch (e) {}
  };

  const updateCameraTelemetry = (telemetry) => {
    if (!telemetry?.camera_id) return;
    setCameras((prev) =>
      prev.map((c) => (c.id === telemetry.camera_id ? { ...c, telemetry } : c))
    );
  };

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0];


  const handleAcknowledgeAlert = async (eventId) => {
    try {
      await api.acknowledgeEvent(eventId, 'Acknowledged via live alert drawer', 'SSB Duty Operator');
      setAlerts((prev) =>
        prev.map((a) => (a.event_id === eventId || a.id === eventId ? { ...a, status: 'ACKNOWLEDGED' } : a))
      );
      fetchStats();
    } catch (err) {
      alert(`Failed to acknowledge: ${err.message}`);
    }
  };

  const handleZoneSaved = (newPolygon) => {
    setCameras((prev) =>
      prev.map((c) => (c.id === selectedCameraId ? { ...c, restricted_zone: newPolygon } : c))
    );
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    wsService.setSoundEnabled(next);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-soc-900">
      {/* 3-Column SOC Stage Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Camera Selector */}
        <CameraSelector
          cameras={cameras}
          selectedCameraId={selectedCameraId}
          onSelectCamera={(id) => setSelectedCameraId(id)}
        />

        {/* Center: Live Video Feed OR 2x2 Quad-View Grid */}
        {viewMode === 'quad' ? (
          <MultiCameraGrid
            cameras={cameras}
            onSelectCamera={(id) => setSelectedCameraId(id)}
            onOpenFocusView={() => setViewMode('focus')}
          />
        ) : (
          <LiveCameraFeed
            camera={selectedCamera}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode(viewMode === 'focus' ? 'quad' : 'focus')}
            onOpenZoneEditor={() => setIsZoneEditorOpen(true)}
            onOpenSourceModal={() => setIsSourceModalOpen(true)}
            onOpenDroneRecon={() => setIsDroneReconOpen(true)}
            onQuickSnapshot={() => alert('Snapshot captured.')}
          />
        )}

        {/* Right: Live Real-Time Alert Drawer */}
        <AlertPanel
          alerts={alerts}
          onSelectEvent={(eventId) => setInspectEventId(eventId)}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          onOpenDispatch={(alert) => setDispatchAlert(alert)}
        />
      </div>

      {/* Bottom: Diagnostics and Health Bar */}
      <DiagnosticsBar
        stats={systemStats}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Virtual Zone Editor Modal */}
      {isZoneEditorOpen && (
        <VirtualZoneEditor
          camera={selectedCamera}
          isOpen={isZoneEditorOpen}
          onClose={() => setIsZoneEditorOpen(false)}
          onZoneSaved={handleZoneSaved}
        />
      )}

      {/* Stream Source Selector Modal */}
      {isSourceModalOpen && (
        <StreamSourceModal
          camera={selectedCamera}
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
          onSourceUpdated={loadInitialData}
        />
      )}

      {/* Airborne UAV Drone Reconnaissance Modal */}
      {isDroneReconOpen && (
        <DroneReconModal
          isOpen={isDroneReconOpen}
          onClose={() => setIsDroneReconOpen(false)}
        />
      )}

      {/* Incident Details & SHA-256 Evidence Inspector Modal */}
      {inspectEventId && (
        <EventDetailsModal
          eventId={inspectEventId}
          isOpen={!!inspectEventId}
          onClose={() => setInspectEventId(null)}
          onEventUpdated={loadInitialData}
        />
      )}

      {/* Tactical QRF Dispatch Modal */}
      {dispatchAlert && (
        <DispatchModal
          event={dispatchAlert}
          isOpen={!!dispatchAlert}
          onClose={() => setDispatchAlert(null)}
          onDispatched={loadInitialData}
        />
      )}
    </div>
  );
}
