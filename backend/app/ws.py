"""
ws.py – WebSocket manager: broadcasts events to all connected clients.
"""
import asyncio
import json
from typing import Set

from fastapi import WebSocket

_connections: Set[WebSocket] = set()


async def connect(ws: WebSocket):
    await ws.accept()
    _connections.add(ws)


def disconnect(ws: WebSocket):
    _connections.discard(ws)


async def broadcast(payload: dict):
    """Send a JSON payload to all active WebSocket connections."""
    if not _connections:
        return
    msg = json.dumps(payload)
    dead = set()
    for ws in list(_connections):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _connections.discard(ws)


def active_connections() -> int:
    return len(_connections)
