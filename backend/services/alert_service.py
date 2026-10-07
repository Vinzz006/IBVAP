import asyncio
import json
import logging
import time
from typing import List, Dict, Any, Set
from fastapi import WebSocket

try:
    import orjson
    def json_dumps(obj: Any) -> str:
        return orjson.dumps(obj).decode("utf-8")
except ImportError:
    def json_dumps(obj: Any) -> str:
        return json.dumps(obj, default=str)

logger = logging.getLogger(__name__)

class AlertBroadcaster:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._last_telemetry_time = 0.0
        self._telemetry_interval = 0.2  # 5 Hz max telemetry throttle

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_alert(self, alert_data: Dict[str, Any]):
        """Broadcasts a high-priority security alert immediately without throttling."""
        if not self.active_connections:
            return

        message = {
            "type": "SECURITY_ALERT",
            "timestamp": time.time(),
            "data": alert_data
        }
        await self._send_to_all(message)

    async def broadcast_telemetry(self, telemetry_data: Dict[str, Any], force: bool = False):
        """Broadcasts operational telemetry throttled to max 5 Hz."""
        now = time.monotonic()
        if not force and (now - self._last_telemetry_time) < self._telemetry_interval:
            return

        self._last_telemetry_time = now
        if not self.active_connections:
            return

        message = {
            "type": "TELEMETRY",
            "timestamp": time.time(),
            "data": telemetry_data
        }
        await self._send_to_all(message)

    async def broadcast_custom(self, msg_type: str, data: Any):
        if not self.active_connections:
            return
        message = {
            "type": msg_type,
            "timestamp": time.time(),
            "data": data
        }
        await self._send_to_all(message)

    async def _send_to_all(self, message: Dict[str, Any]):
        if not self.active_connections:
            return

        try:
            payload = json_dumps(message)
        except Exception:
            payload = json.dumps(message, default=str)

        stale = []
        async with self._lock:
            connections = list(self.active_connections)

        for ws in connections:
            try:
                await ws.send_text(payload)
            except Exception:
                stale.append(ws)

        if stale:
            async with self._lock:
                for ws in stale:
                    self.active_connections.discard(ws)

alert_broadcaster = AlertBroadcaster()
