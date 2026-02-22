# Comic Automation

End-to-end automation pipeline for turning a story idea into a finished comic-style video.

## Core Components

- **GPT-5.3-codex**: Orchestrator for scriptwriting, storyboarding, timeline planning, and control strategy decisions
- **Seedance 2.0**: Video segment generation engine
- **OpenClaw**: Workflow orchestration, task execution, and automation integration

## Documentation

- `docs/DD-001-product-design-v0.1.md`: Initial design document (project backbone)
- `docs/DD-002-timeline-v1-spec-and-sample.md`: Timeline v1 specification and sample

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
