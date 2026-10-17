# WebSocket Events Contract (`/ws/alerts`)

The server pushes real-time notifications over the WebSocket connection at `/ws/alerts`.
All events follow a standardized JSON envelope:

```json
{
  "event": "disruption_created | disruption_updated | disruption_resolved | recommendation_ready | plan_applied | simulation_reset",
  "ts": "2026-10-17T09:30:02Z",
  "data": {}
}
```

## Event Types and Data Payloads

### 1. `disruption_created`
Emitted when a new disruption is detected by any rule.
```json
{
  "event": "disruption_created",
  "ts": "2026-10-17T09:30:00Z",
  "data": {
    "id": "d_weather_L_pune_mumbai",
    "type": "weather",
    "level": "high",
    "entity_name": "Pune to Mumbai",
    "risk_score": 78.4
  }
}
```

### 2. `disruption_updated`
Emitted when an existing open disruption severity or risk score changes.
```json
{
  "event": "disruption_updated",
  "ts": "2026-10-17T09:31:00Z",
  "data": {
    "id": "d_traffic_L_delhi_jaipur",
    "type": "traffic",
    "level": "medium",
    "entity_name": "Delhi NCR to Jaipur",
    "risk_score": 52.0
  }
}
```

### 3. `disruption_resolved`
Emitted when an issue clears for 3 consecutive detection runs or risk drops below threshold.
```json
{
  "event": "disruption_resolved",
  "ts": "2026-10-17T09:35:00Z",
  "data": {
    "id": "d_weather_L_pune_mumbai"
  }
}
```

### 4. `recommendation_ready`
Emitted when candidate recommendations have been generated and ranked for a disruption.
```json
{
  "event": "recommendation_ready",
  "ts": "2026-10-17T09:30:02Z",
  "data": {
    "disruption_id": "d_weather_L_pune_mumbai",
    "top_action": "Reroute S-104 via Surat"
  }
}
```

### 5. `plan_applied`
Emitted when a user approves a recommendation, indicating that network routes, orders, or stock have been updated.
```json
{
  "event": "plan_applied",
  "ts": "2026-10-17T09:32:00Z",
  "data": {
    "recommendation_id": "rec_001",
    "disruption_id": "d_weather_L_pune_mumbai",
    "action_type": "reroute",
    "before_risk_score": 78.4,
    "after_risk_score": 31.2
  }
}
```

### 6. `simulation_reset`
Emitted when a simulation reset is executed.
```json
{
  "event": "simulation_reset",
  "ts": "2026-10-17T09:40:00Z",
  "data": {
    "message": "Network reset to baseline state."
  }
}
```
