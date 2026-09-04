const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('ibvap_token');
export const setAuthToken = (token) => localStorage.setItem('ibvap_token', token);
export const removeAuthToken = () => localStorage.removeItem('ibvap_token');

export const getCurrentUser = () => {
  const user = localStorage.getItem('ibvap_user');
  return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user) => {
  localStorage.setItem('ibvap_user', JSON.stringify(user));
};

export const clearAuth = () => {
  removeAuthToken();
  localStorage.removeItem('ibvap_user');
};

function buildQueryString(params = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null') {
      clean[k] = v;
    }
  }
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
}

async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuth();
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'API request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (username, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuthToken(data.access_token);
    setCurrentUser(data.user);
    return data;
  },
  getMe: () => apiFetch('/auth/me'),

  // Cameras
  getCameras: () => apiFetch('/cameras'),
  getCamera: (id) => apiFetch(`/cameras/${id}`),
  updateCameraZone: (id, polygon) => apiFetch(`/cameras/${id}/zone`, {
    method: 'POST',
    body: JSON.stringify({ polygon })
  }),
  updateCameraSource: (id, stream_url) => apiFetch(`/cameras/${id}/source`, {
    method: 'POST',
    body: JSON.stringify({ stream_url: String(stream_url) })
  }),
  getAvailableWebcams: () => apiFetch('/cameras/webcams/detect'),
  createCamera: (cameraData) => apiFetch('/cameras', {
    method: 'POST',
    body: JSON.stringify(cameraData)
  }),

  // Events
  getEvents: (params = {}) => apiFetch(`/events${buildQueryString(params)}`),
  getEvent: (id) => apiFetch(`/events/${id}`),
  acknowledgeEvent: (id, notes = '', operator_name = '') => apiFetch(`/events/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ notes, operator_name })
  }),
  resolveEvent: (id, notes = '', operator_name = '') => apiFetch(`/events/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ notes, operator_name })
  }),
  reconstructJourney: (objectType = 'person') => apiFetch(`/events/reconstruct-journey?object_type=${objectType}`),
  dispatchResponse: (id, dispatchData) => apiFetch(`/events/${id}/dispatch-response`, {
    method: 'POST',
    body: JSON.stringify(dispatchData)
  }),

  // Evidence
  verifyEvidence: (eventId) => apiFetch(`/evidence/events/${eventId}/verify`, {
    method: 'POST'
  }),
  simulateTamper: (eventId) => apiFetch(`/evidence/events/${eventId}/simulate-tamper`, {
    method: 'POST'
  }),

  // System, Sensors & Diagnostics
  getSystemStats: () => apiFetch('/system/stats'),
  getThreatAnalytics: () => apiFetch('/system/analytics'),
  getGeoNodes: () => apiFetch('/system/geo-nodes'),
  getAuditLogs: (limit = 50) => apiFetch(`/system/audit-logs?limit=${limit}`),
  triggerScenario: (cameraId, scenarioName) => apiFetch('/system/trigger-scenario', {
    method: 'POST',
    body: JSON.stringify({ camera_id: cameraId, scenario_name: scenarioName })
  }),
  getDroneFleet: () => apiFetch('/system/drone-fleet'),
  getDroneTelemetry: (droneId = 'SSB-UAV-DRONE-04') => apiFetch(`/system/drone-telemetry?drone_id=${encodeURIComponent(droneId)}`),
  sendDroneCommand: (commandData) => apiFetch('/system/drone-command', {
    method: 'POST',
    body: JSON.stringify(commandData)
  }),
  getAcousticTelemetry: () => apiFetch('/system/acoustic-telemetry'),
  getDiagnosticsMatrix: () => apiFetch('/system/diagnostics-matrix'),
  executeRedTeamTest: (scenarioData) => apiFetch('/system/red-team-stress-test', {
    method: 'POST',
    body: JSON.stringify(scenarioData)
  }),
  getShiftHandoverReport: () => apiFetch('/system/shift-handover-report'),
  getPredictiveRiskForecast: () => apiFetch('/system/predictive-risk-forecast'),

  // Phase 7: Edge & Offline Intelligence
  getEdgeStatus: () => apiFetch('/edge/status'),
  simulateNetwork: (online, reason) => apiFetch('/edge/simulate-network', {
    method: 'POST',
    body: JSON.stringify({ online, reason })
  }),
  queueOfflineEvent: (payload) => apiFetch('/edge/queue-offline-event', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  syncEdgeQueue: () => apiFetch('/edge/sync', {
    method: 'POST'
  }),

  // Phase 8: Multi-Camera Intelligence
  searchTargets: (query = '') => apiFetch(`/targets/search${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  getTargetJourney: (targetId) => apiFetch(`/targets/${targetId}/journey`),

  // Phase 9: Explainable AI (XAI)
  getEventExplanation: (eventId) => apiFetch(`/explainability/events/${eventId}`),

  // Phase 10: Privacy & Governance
  getPrivacySettings: () => apiFetch('/privacy/settings'),
  updatePrivacySettings: (settingsData) => apiFetch('/privacy/settings', {
    method: 'POST',
    body: JSON.stringify(settingsData)
  }),
  getFilteredAuditLogs: (params = {}) => apiFetch(`/privacy/audit${buildQueryString(params)}`),

  // Phase 11: Border Digital Twin
  getSimulationState: () => apiFetch('/simulation/state'),
  spawnSimulationEntity: (spawnData) => apiFetch('/simulation/spawn', {
    method: 'POST',
    body: JSON.stringify(spawnData)
  }),
  triggerSimulationEvent: (eventData) => apiFetch('/simulation/trigger-event', {
    method: 'POST',
    body: JSON.stringify(eventData)
  }),
  resetSimulation: () => apiFetch('/simulation/reset', {
    method: 'POST'
  }),

  // Phase 13: Command Decision Intelligence
  getDecisionOverview: () => apiFetch('/decision/overview'),
  getDecisionPriorities: (limit = 15) => apiFetch(`/decision/priorities?limit=${limit}`),
  getDecisionSectors: () => apiFetch('/decision/sectors'),
  getDecisionDetail: (eventId) => apiFetch(`/decision/${eventId}`),
  getDecisionRecommendation: (eventId) => apiFetch(`/decision/${eventId}/recommendation`),
  getDecisionTimeline: (eventId) => apiFetch(`/decision/${eventId}/timeline`),
  getDecisionPredictive: (eventId) => apiFetch(`/decision/${eventId}/predictive`),
  getDecisionHistory: (eventId) => apiFetch(`/decision/${eventId}/history`),
  acknowledgeDecisionIncident: (eventId, operatorUsername = 'Duty Officer') => apiFetch(`/decision/${eventId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ operator_username: operatorUsername })
  }),
  triggerDecisionDemo: () => apiFetch('/decision/demo-scenario', {
    method: 'POST'
  }),

  // Phase 13: Federated Border Intelligence
  getSectors: () => apiFetch('/sectors'),
  createSector: (sectorData) => apiFetch('/sectors', {
    method: 'POST',
    body: JSON.stringify(sectorData)
  }),
  getSector: (id) => apiFetch(`/sectors/${id}`),
  getEdgeNodes: () => apiFetch('/edge-nodes'),
  registerEdgeNode: (nodeData) => apiFetch('/edge-nodes', {
    method: 'POST',
    body: JSON.stringify(nodeData)
  }),
  getEdgeNode: (id) => apiFetch(`/edge-nodes/${id}`),
  postNodeHeartbeat: (id, telemetry) => apiFetch(`/edge-nodes/${id}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify(telemetry)
  }),
  submitIntelligence: (payload) => apiFetch('/federation/intelligence', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getFederationIntelligence: (limit = 50) => apiFetch(`/federation/intelligence?limit=${limit}`),
  getFederationSync: () => apiFetch('/federation/sync'),
  triggerFederationSync: () => apiFetch('/federation/sync', {
    method: 'POST'
  }),
  getFederationCorrelations: (limit = 20) => apiFetch(`/federation/correlations?limit=${limit}`),
  getFederationGraph: () => apiFetch('/federation/graph'),
  getFederationHealth: () => apiFetch('/federation/health'),
  getFederationDecision: () => apiFetch('/federation/decision'),
  requestFederatedEvidence: (eventId, operatorUsername = 'Duty Officer') => apiFetch('/federation/evidence-request', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId, operator_username: operatorUsername })
  }),
  runFederationSimulation: (action, sectorId = 'SEC-C', targetId = 17) => apiFetch('/federation/simulate-scenario', {
    method: 'POST',
    body: JSON.stringify({ action, sector_id: sectorId, target_id: targetId })
  }),

  // Phase 14: Mission Orchestration & Autonomous Operations
  getMissions: (params = {}) => apiFetch(`/missions${buildQueryString(params)}`),
  getMission: (id) => apiFetch(`/missions/${id}`),
  createMission: (missionData) => apiFetch('/missions', {
    method: 'POST',
    body: JSON.stringify(missionData)
  }),
  updateMissionStatus: (id, status, notes = '', operatorUsername = '') => apiFetch(`/missions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes, operator_username: operatorUsername })
  }),
  assignMissionOperator: (id, assignedOperator, actingUser = '') => apiFetch(`/missions/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assigned_operator: assignedOperator, acting_user: actingUser })
  }),
  getMissionTimeline: (id) => apiFetch(`/missions/${id}/timeline`),
  getMissionContext: (id) => apiFetch(`/missions/${id}/context`),
  getMissionRecommendations: (id) => apiFetch(`/missions/${id}/recommendations`),
  approveMissionResponse: (id, payload = {}) => apiFetch(`/missions/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  rejectMissionResponse: (id, payload = {}) => apiFetch(`/missions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  escalateMission: (id, payload = {}) => apiFetch(`/missions/${id}/escalate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  resolveMission: (id, payload = {}) => apiFetch(`/missions/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getMissionHealth: (id) => apiFetch(`/missions/${id}/health`),
  getMissionOverview: () => apiFetch('/missions/stats/overview'),
  getMissionAnalytics: () => apiFetch('/missions/stats/analytics'),
  runMissionDemoScenario: (operatorUsername = 'Duty Officer P. Singh') => apiFetch('/missions/demo-scenario', {
    method: 'POST',
    body: JSON.stringify({ operator_username: operatorUsername })
  }),

  // Phase 16: Zero-Trust Security & Cyber Resilience API
  getSecurityOverview: () => apiFetch('/security/overview'),
  getSecurityHealth: () => apiFetch('/security/health'),
  getSecurityEvents: (params = {}) => apiFetch(`/security/events${buildQueryString(params)}`),
  getSecurityEventDetail: (id) => apiFetch(`/security/events/${id}`),
  acknowledgeSecurityEvent: (id, payload = {}) => apiFetch(`/security/events/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  resolveSecurityEvent: (id, payload = {}) => apiFetch(`/security/events/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getNodeTrustMatrix: () => apiFetch('/security/nodes'),
  rotateNodeCredential: (nodeId, payload = {}) => apiFetch(`/security/nodes/${nodeId}/rotate-credential`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  quarantineNode: (nodeId, payload = {}) => apiFetch(`/security/nodes/${nodeId}/quarantine`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  restoreNodeTrust: (nodeId, payload = {}) => apiFetch(`/security/nodes/${nodeId}/restore`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getSecurityAuditLogs: (params = {}) => apiFetch(`/security/audit${buildQueryString(params)}`),
  getRbacMatrix: () => apiFetch('/security/matrix'),
  triggerSecuritySimulation: (scenario, operatorName = 'Red Team Operator') => apiFetch('/security/simulation/trigger', {
    method: 'POST',
    body: JSON.stringify({ scenario, operator_name: operatorName })
  }),
  resetSecuritySimulation: (operatorName = 'Duty Officer') => apiFetch('/security/simulation/reset', {
    method: 'POST',
    body: JSON.stringify({ operator_name: operatorName })
  }),
  generateSecurityReport: (operatorName = 'Duty Officer') => apiFetch('/security/report', {
    method: 'POST',
    body: JSON.stringify({ operator_name: operatorName })
  })
};



