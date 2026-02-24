# Comic Automation

End-to-end automation pipeline for turning a story idea into a finished comic-style video.

## Core Components

- **GPT-5.3-codex**: Orchestrator for scriptwriting, storyboarding, timeline planning, and control strategy decisions
- **Seedance 1.5 Pro (`doubao-seedance-1-5-pro-251215`)**: Default video generation engine (API-available)
- **OpenClaw**: Workflow orchestration, task execution, and automation integration

## Documentation

- `docs/DD-001-product-design-v0.1.md`: Initial design document (project backbone)
- `docs/DD-002-timeline-v1-spec-and-sample.md`: Timeline v1 specification and sample
- `docs/DD-003-workflow-v1-execution-contract.md`: Workflow v1 execution contract
- `docs/DD-004-mvp-implementation-plan-v1.md`: v1 MVP implementation plan
- `docs/DD-005-v1-mvp-implementation-report-phase-ab.md`: implementation report for Phase A/B mock execution

## Directory Structure

- `docs/` - Design documents
- `specs/` - Data protocols, schemas, and interface specifications
- `prompts/` - Prompt templates and strategies
- `workflows/` - OpenClaw workflow definitions
- `scripts/` - Execution scripts
- `assets/` - Character and scene reference materials
- `outputs/` - Generated results and intermediate artifacts
- `status/` - Milestones, task status, and change logs

## Specifications

- `specs/timeline.v1.schema.json`: JSON Schema for timeline v1
- `specs/examples/timeline.v1.sample.json`: Sample timeline for "Socially Anxious Programmer at a Dating Event" (45s, 5 shots)
