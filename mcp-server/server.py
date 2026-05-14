#!/usr/bin/env python3
"""Team Manager MCP server — wraps the REST API at BASE_URL."""

import os
import json
from typing import Any
import httpx
import mcp.server.stdio
import mcp.types as types
from mcp.server import Server

BASE_URL = os.environ.get("TEAM_MANAGER_API_URL", "http://localhost:5000")

app = Server("team-manager")
_http: httpx.AsyncClient | None = None


def http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(base_url=BASE_URL, timeout=30)
    return _http


def _ok(data: Any) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=json.dumps(data, indent=2))]


def _err(msg: str) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=f"Error: {msg}")]


async def _get(path: str, params: dict | None = None) -> list[types.TextContent]:
    r = await http().get(path, params={k: v for k, v in (params or {}).items() if v is not None})
    r.raise_for_status()
    return _ok(r.json())


async def _post(path: str, body: dict) -> list[types.TextContent]:
    r = await http().post(path, json={k: v for k, v in body.items() if v is not None})
    r.raise_for_status()
    return _ok(r.json())


async def _patch(path: str, body: dict | None = None) -> list[types.TextContent]:
    r = await http().patch(path, json={k: v for k, v in (body or {}).items() if v is not None} if body else None)
    r.raise_for_status()
    return _ok(r.json())


async def _delete(path: str) -> list[types.TextContent]:
    r = await http().delete(path)
    if r.status_code == 204:
        return _ok({"success": True})
    r.raise_for_status()
    return _ok(r.json())


TOOLS = [
    # ── PIs ───────────────────────────────────────────────────────────────
    types.Tool(
        name="list_pis",
        description="List all Program Increments (PIs).",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_pi",
        description="Get a single PI by ID.",
        inputSchema={
            "type": "object",
            "properties": {"pi_id": {"type": "string", "description": "PI UUID"}},
            "required": ["pi_id"],
        },
    ),
    types.Tool(
        name="create_pi",
        description="Create a new Program Increment.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "description": {"type": "string"},
            },
            "required": ["name", "start_date", "end_date"],
        },
    ),
    # ── Sprints ───────────────────────────────────────────────────────────
    types.Tool(
        name="list_sprints",
        description="List sprints, optionally filtered by PI or date range.",
        inputSchema={
            "type": "object",
            "properties": {
                "pi_id": {"type": "string", "description": "Filter by PI UUID"},
                "from": {"type": "string", "description": "From date YYYY-MM-DD"},
                "to": {"type": "string", "description": "To date YYYY-MM-DD"},
            },
            "required": [],
        },
    ),
    types.Tool(
        name="get_sprint",
        description="Get a sprint by ID.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="create_sprint",
        description="Create a new sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "pi_id": {"type": "string"},
                "sprint_number": {"type": "integer"},
                "is_innovation_sprint": {"type": "boolean"},
                "goal": {"type": "string"},
            },
            "required": ["name", "start_date", "end_date"],
        },
    ),
    types.Tool(
        name="close_sprint",
        description="Close (complete) a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_sprint_velocity",
        description="Get velocity data across sprints, optionally scoped to a PI.",
        inputSchema={
            "type": "object",
            "properties": {"pi_id": {"type": "string"}},
            "required": [],
        },
    ),
    # ── Team Members ──────────────────────────────────────────────────────
    types.Tool(
        name="list_team_members",
        description="List team members, optionally filtered by role, team lead, or active status.",
        inputSchema={
            "type": "object",
            "properties": {
                "role": {"type": "string", "enum": ["Member", "TeamLead", "TechLead"]},
                "team_lead_id": {"type": "string"},
                "is_active": {"type": "boolean"},
            },
            "required": [],
        },
    ),
    types.Tool(
        name="get_team_member",
        description="Get a team member by ID.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="create_team_member",
        description="Add a new team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "email": {"type": "string"},
                "role": {"type": "string", "enum": ["Member", "TeamLead", "TechLead"]},
                "team_lead_id": {"type": "string"},
                "crafts": {"type": "array", "items": {"type": "string"}},
                "birth_date": {"type": "string", "description": "YYYY-MM-DD"},
                "join_date": {"type": "string", "description": "YYYY-MM-DD"},
            },
            "required": ["first_name", "last_name", "email", "role"],
        },
    ),
    # ── Work Items ────────────────────────────────────────────────────────
    types.Tool(
        name="list_work_items",
        description="List work items for a sprint member.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_member_id": {"type": "string"}},
            "required": ["sprint_member_id"],
        },
    ),
    types.Tool(
        name="create_work_item",
        description="Create a work item for a sprint member.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_member_id": {"type": "string"},
                "title": {"type": "string"},
                "type": {"type": "string", "enum": ["Task", "Analysis", "Design", "Dev", "QA", "Bug", "Release"]},
                "status": {"type": "string", "enum": ["Planned", "InProgress", "Blocked", "Completed", "ReadyForRelease", "Released"]},
                "description": {"type": "string"},
                "feature_id": {"type": "string"},
                "external_ticket_ref": {"type": "string"},
                "estimated_points": {"type": "number"},
                "actual_points": {"type": "number"},
                "completed_date": {"type": "string", "description": "YYYY-MM-DD"},
                "blocked_reason": {"type": "string"},
            },
            "required": ["sprint_member_id", "title", "type", "status"],
        },
    ),
    types.Tool(
        name="update_work_item_status",
        description="Update the status of a work item.",
        inputSchema={
            "type": "object",
            "properties": {
                "work_item_id": {"type": "string"},
                "status": {"type": "string", "enum": ["Planned", "InProgress", "Blocked", "Completed", "ReadyForRelease", "Released"]},
            },
            "required": ["work_item_id", "status"],
        },
    ),
    # ── Dashboard ─────────────────────────────────────────────────────────
    types.Tool(
        name="get_sprint_dashboard",
        description="Get the full sprint dashboard (member cards, progress, leave).",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "team_lead_id": {"type": "string", "description": "Filter dashboard to a specific team lead's members"},
            },
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_sprint_summary",
        description="Get a high-level summary for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_sprint_blockers",
        description="List all blocked work items for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_leave_summary",
        description="Get the leave summary (who is off, how many days) for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    # ── Leave Records ─────────────────────────────────────────────────────
    types.Tool(
        name="list_leave_records",
        description="List leave records, optionally filtered by member, sprint, or date range.",
        inputSchema={
            "type": "object",
            "properties": {
                "team_member_id": {"type": "string"},
                "sprint_id": {"type": "string"},
                "from": {"type": "string", "description": "YYYY-MM-DD"},
                "to": {"type": "string", "description": "YYYY-MM-DD"},
            },
            "required": [],
        },
    ),
    types.Tool(
        name="create_leave_record",
        description="Record leave for a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "team_member_id": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "type": {"type": "string", "enum": ["Annual", "Sick", "Other", "Birthday", "Loyalty", "Discretionary", "FamilyResponsibility"]},
                "days_count": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["team_member_id", "start_date", "end_date", "type", "days_count"],
        },
    ),
    # ── Leaderboard ───────────────────────────────────────────────────────
    types.Tool(
        name="get_leaderboard",
        description="Get the team leaderboard (points rankings).",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="award_points",
        description="Award leaderboard points to a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "team_member_id": {"type": "string"},
                "points": {"type": "integer"},
                "reason": {"type": "string"},
            },
            "required": ["team_member_id", "points", "reason"],
        },
    ),
]


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return TOOLS


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        match name:
            # PIs
            case "list_pis":
                return await _get("/api/v1/pis")
            case "get_pi":
                return await _get(f"/api/v1/pis/{arguments['pi_id']}")
            case "create_pi":
                return await _post("/api/v1/pis", {
                    "name": arguments["name"],
                    "startDate": arguments["start_date"],
                    "endDate": arguments["end_date"],
                    "description": arguments.get("description"),
                })
            # Sprints
            case "list_sprints":
                return await _get("/api/v1/sprints", {
                    "piId": arguments.get("pi_id"),
                    "from": arguments.get("from"),
                    "to": arguments.get("to"),
                })
            case "get_sprint":
                return await _get(f"/api/v1/sprints/{arguments['sprint_id']}")
            case "create_sprint":
                return await _post("/api/v1/sprints", {
                    "name": arguments["name"],
                    "startDate": arguments["start_date"],
                    "endDate": arguments["end_date"],
                    "piId": arguments.get("pi_id"),
                    "sprintNumber": arguments.get("sprint_number"),
                    "isInnovationSprint": arguments.get("is_innovation_sprint", False),
                    "goal": arguments.get("goal"),
                })
            case "close_sprint":
                return await _patch(f"/api/v1/sprints/{arguments['sprint_id']}/close")
            case "get_sprint_velocity":
                return await _get("/api/v1/sprints/velocity", {"piId": arguments.get("pi_id")})
            # Team Members
            case "list_team_members":
                return await _get("/api/v1/team-members", {
                    "role": arguments.get("role"),
                    "teamLeadId": arguments.get("team_lead_id"),
                    "isActive": arguments.get("is_active"),
                })
            case "get_team_member":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}")
            case "create_team_member":
                return await _post("/api/v1/team-members", {
                    "firstName": arguments["first_name"],
                    "lastName": arguments["last_name"],
                    "email": arguments["email"],
                    "role": arguments["role"],
                    "teamLeadId": arguments.get("team_lead_id"),
                    "crafts": arguments.get("crafts"),
                    "birthDate": arguments.get("birth_date"),
                    "joinDate": arguments.get("join_date"),
                })
            # Work Items
            case "list_work_items":
                return await _get(f"/api/v1/sprint-members/{arguments['sprint_member_id']}/work-items")
            case "create_work_item":
                return await _post(
                    f"/api/v1/sprint-members/{arguments['sprint_member_id']}/work-items",
                    {
                        "title": arguments["title"],
                        "type": arguments["type"],
                        "status": arguments["status"],
                        "description": arguments.get("description"),
                        "featureId": arguments.get("feature_id"),
                        "externalTicketRef": arguments.get("external_ticket_ref"),
                        "estimatedPoints": arguments.get("estimated_points"),
                        "actualPoints": arguments.get("actual_points"),
                        "completedDate": arguments.get("completed_date"),
                        "blockedReason": arguments.get("blocked_reason"),
                    },
                )
            case "update_work_item_status":
                return await _patch(
                    f"/api/v1/work-items/{arguments['work_item_id']}/status",
                    {"status": arguments["status"]},
                )
            # Dashboard
            case "get_sprint_dashboard":
                return await _get(
                    f"/api/v1/dashboard/sprint/{arguments['sprint_id']}",
                    {"teamLeadId": arguments.get("team_lead_id")},
                )
            case "get_sprint_summary":
                return await _get(f"/api/v1/dashboard/sprint/{arguments['sprint_id']}/summary")
            case "get_sprint_blockers":
                return await _get(f"/api/v1/dashboard/sprint/{arguments['sprint_id']}/blockers")
            case "get_leave_summary":
                return await _get(f"/api/v1/dashboard/sprint/{arguments['sprint_id']}/leave-summary")
            # Leave Records
            case "list_leave_records":
                return await _get("/api/v1/leave-records", {
                    "teamMemberId": arguments.get("team_member_id"),
                    "sprintId": arguments.get("sprint_id"),
                    "from": arguments.get("from"),
                    "to": arguments.get("to"),
                })
            case "create_leave_record":
                return await _post("/api/v1/leave-records", {
                    "teamMemberId": arguments["team_member_id"],
                    "startDate": arguments["start_date"],
                    "endDate": arguments["end_date"],
                    "type": arguments["type"],
                    "daysCount": arguments["days_count"],
                    "notes": arguments.get("notes"),
                })
            # Leaderboard
            case "get_leaderboard":
                return await _get("/api/v1/leaderboard")
            case "award_points":
                return await _post("/api/v1/leaderboard/award", {
                    "teamMemberId": arguments["team_member_id"],
                    "points": arguments["points"],
                    "reason": arguments["reason"],
                })
            case _:
                return _err(f"Unknown tool: {name}")
    except httpx.HTTPStatusError as e:
        return _err(f"HTTP {e.response.status_code}: {e.response.text}")
    except httpx.RequestError as e:
        return _err(f"Request failed: {e}")


async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
