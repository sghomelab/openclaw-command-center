"""Alert service — rule evaluation, notification dispatch."""
from datetime import datetime, timezone
from typing import List, Optional
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import AlertRule, Alert


async def evaluate_rules(db: AsyncSession, metrics: dict) -> List[Alert]:
    """Check all active alert rules against current metrics."""
    result = await db.execute(select(AlertRule).where(AlertRule.is_active == True))
    rules = result.scalars().all()
    new_alerts = []

    for rule in rules:
        metric_value = metrics.get(rule.metric_path)
        if metric_value is None:
            continue

        if rule.condition_type == "threshold" and rule.threshold_value is not None:
            triggered = False
            op = rule.threshold_operator or ">"
            if op == ">" and metric_value > rule.threshold_value:
                triggered = True
            elif op == ">=" and metric_value >= rule.threshold_value:
                triggered = True
            elif op == "<" and metric_value < rule.threshold_value:
                triggered = True
            elif op == "<=" and metric_value <= rule.threshold_value:
                triggered = True
            elif op == "==" and metric_value == rule.threshold_value:
                triggered = True

            if triggered:
                alert = Alert(
                    rule_id=rule.id,
                    metric_value=metric_value,
                    payload=json.dumps({"rule": rule.name, "metric": rule.metric_path, "value": metric_value}),
                )
                db.add(alert)
                new_alerts.append(alert)

    if new_alerts:
        await db.commit()
        for alert in new_alerts:
            await db.refresh(alert)

    return new_alerts


async def send_notification(alert: Alert, channels: List[str]):
    """Dispatch notification to configured channels (stub)."""
    # Phase 3.2: wire up actual email/Slack/Teams/SMS
    for channel in channels:
        print(f"[NOTIFICATION] Channel={channel} Alert={alert.id} Status={alert.status}")
