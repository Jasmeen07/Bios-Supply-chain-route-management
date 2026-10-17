# SupplySense WebSocket Events Specification

This document specifies the WebSocket protocol and event schemas for SupplySense live alerts.

## Connection

- **Endpoint**: `/ws/alerts`
- **Protocol**: Standard WebSocket (ws:// or wss://)
- **Heartbeat**: Ping/Pong every 30 seconds

## Envelope Format

All messages sent by the server follow this JSON envelope:

```json
{
  "event": "disruption_created | disruption_updated | disruption_resolved | recommendation_ready | plan_applied",
  "ts": "2026-10-17T09:30:02Z",
  "data": { ... }
}
```

## Event Types and Payloads

### 1. `disruption_created`
Emitted when the detection engine identifies a new disruption.

```json
{
  "event": "disruption_created",
  "ts": "2026-10-17T09:30:02Z",
  "data": {
    "disruption": {
      "id": "d_101",
      "type": "weather",
      "entity": {
        "type": "lane",
        "id": "L_mumbai_pune",
        "name": "Mumbai to Pune Corridor"
      },
      "severity": 0.85,
      "confidence": 0.78,
      "risk_score": 82,
      "level": "high",
      "status": "open",
      "detected_at": "2026-10-17T09:30:00Z",
      "impact": {
        "affected_shipments": ["S-104", "S-108"],
        "extra_delay_h": 6.5,
        "stockout_date": "2026-10-21",
        "units_short": 340,
        "revenue_at_risk": 125000
      },
      "evidence": [
        {
          "source": "open-meteo",
          "simulated": false,
          "metric": "precip_mm_per_h",
          "value": 18.5,
          "ts": "2026-10-17T09:25:00Z"
        }
      ]
    }
  }
}
```

### 2. `disruption_updated`
Emitted when an active disruption's severity or impact changes.

```json
{
  "event": "disruption_updated",
  "ts": "2026-10-17T09:45:00Z",
  "data": {
    "disruption_id": "d_101",
    "severity": 0.92,
    "risk_score": 88,
    "level": "high",
    "impact": {
      "affected_shipments": ["S-104", "S-108", "S-112"],
      "extra_delay_h": 8.0,
      "stockout_date": "2026-10-20",
      "units_short": 480,
      "revenue_at_risk": 172000
    }
  }
}
```

### 3. `disruption_resolved`
Emitted when conditions return to normal for 3 consecutive detection runs.

```json
{
  "event": "disruption_resolved",
  "ts": "2026-10-17T11:00:00Z",
  "data": {
    "disruption_id": "d_101",
    "resolved_at": "2026-10-17T11:00:00Z",
    "reason": "Signal cleared below detection threshold for 3 consecutive cycles"
  }
}
```

### 4. `recommendation_ready`
Emitted when the response generator finishes calculating and ranking candidate actions for a disruption.

```json
{
  "event": "recommendation_ready",
  "ts": "2026-10-17T09:30:04Z",
  "data": {
    "disruption_id": "d_101",
    "recommendations": [
      {
        "id": "r_501",
        "disruption_id": "d_101",
        "rank": 1,
        "action_type": "reroute",
        "title": "Reroute S-104 via Nashik",
        "explanation": "Reroute shipment S-104 via Nashik instead of Pune corridor. Avoids heavy rain forecast, saves 5.5 h, costs 3.8% more, and lowers risk score from 82 to 28.",
        "delay_saved_h": 5.5,
        "cost_delta_pct": 3.8,
        "risk_reduction": 54,
        "confidence": 0.81,
        "status": "proposed"
      }
    ]
  }
}
```

### 5. `plan_applied`
Emitted after an operator approves a recommendation and the system applies the changes.

```json
{
  "event": "plan_applied",
  "ts": "2026-10-17T09:32:00Z",
  "data": {
    "recommendation_id": "r_501",
    "disruption_id": "d_101",
    "action_type": "reroute",
    "before_risk_score": 82,
    "after_risk_score": 28,
    "applied_at": "2026-10-17T09:32:00Z",
    "shipment_id": "S-104",
    "status": "approved"
  }
}
```
