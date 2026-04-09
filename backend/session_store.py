"""内存 Session 池 — 管理每个面试会话的 Agent 实例。"""

import time
import threading
import logging
from typing import Any

from interfaces.voice_interface import VoiceInterviewInterface

logger = logging.getLogger(__name__)

SESSION_TTL = 3600 * 2  # 2 小时无活动过期


class _SessionEntry:
    __slots__ = ("interface", "last_active", "meta")

    def __init__(self, interface: VoiceInterviewInterface):
        self.interface = interface
        self.last_active = time.time()
        self.meta: dict[str, Any] = {}

    def touch(self):
        self.last_active = time.time()


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, _SessionEntry] = {}
        self._lock = threading.Lock()

    def get(self, session_id: str) -> VoiceInterviewInterface | None:
        with self._lock:
            entry = self._sessions.get(session_id)
            if entry:
                entry.touch()
                return entry.interface
            return None

    def create(self, session_id: str) -> VoiceInterviewInterface:
        iface = VoiceInterviewInterface()
        with self._lock:
            self._sessions[session_id] = _SessionEntry(iface)
        logger.info("Session created: %s (total: %d)", session_id, len(self._sessions))
        return iface

    def get_or_create(self, session_id: str) -> VoiceInterviewInterface:
        iface = self.get(session_id)
        if iface is None:
            iface = self.create(session_id)
        return iface

    def set_meta(self, session_id: str, key: str, value: Any) -> None:
        with self._lock:
            entry = self._sessions.get(session_id)
            if entry:
                entry.meta[key] = value

    def get_meta(self, session_id: str, key: str) -> Any:
        with self._lock:
            entry = self._sessions.get(session_id)
            if entry:
                return entry.meta.get(key)
            return None

    def remove(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def cleanup_expired(self) -> int:
        now = time.time()
        expired = []
        with self._lock:
            for sid, entry in self._sessions.items():
                if now - entry.last_active > SESSION_TTL:
                    expired.append(sid)
            for sid in expired:
                del self._sessions[sid]
        if expired:
            logger.info("Cleaned up %d expired sessions", len(expired))
        return len(expired)

    def get_state(self, session_id: str) -> dict[str, Any]:
        iface = self.get(session_id)
        if iface is None:
            return {}
        return iface.text_interface._agent.state


store = SessionStore()
