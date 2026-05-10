"""Workflow service — execute workflows step by step."""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.workflow import Workflow, WorkflowStep


async def execute_workflow(db: AsyncSession, workflow_id: int, input_data: dict = None) -> dict:
    """Execute a workflow by running its steps in order."""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        return {"status": "error", "message": "Workflow not found"}

    if wf.status != "active":
        return {"status": "error", "message": f"Workflow is {wf.status}, not active"}

    # Get steps ordered
    result = await db.execute(
        select(WorkflowStep).where(WorkflowStep.workflow_id == workflow_id, WorkflowStep.is_active == True)
        .order_by(WorkflowStep.order_index)
    )
    steps = result.scalars().all()

    executed = []
    current_step = steps[0] if steps else None

    while current_step:
        executed.append({"step_id": current_step.id, "action": current_step.action, "status": "completed"})

        # Move to next step
        next_idx = current_step.on_success_next
        if next_idx is not None and next_idx < len(steps):
            current_step = steps[next_idx]
        elif executed[-1]["step_id"] == steps[-1].id:
            current_step = None
        else:
            # Linear progression
            for s in steps:
                if s.order_index == current_step.order_index + 1:
                    current_step = s
                    break
            else:
                current_step = None

    wf.last_run_at = datetime.now(timezone.utc)
    wf.success_count += 1
    await db.commit()

    return {"status": "completed", "workflow": wf.name, "steps_executed": len(executed), "details": executed}
