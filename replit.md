# UMG Compiler & Landing Page

## Overview

This project is a full-stack web application that combines a React frontend with an Express backend, alongside a standalone TypeScript compiler (compiler-v0) for processing "sleeve" configurations. The compiler handles block-based instruction compilation with support for governance rules, merge operations, and bundle segments. The web application serves as a marketing/documentation landing page for the UMG product, following a modern Linear/Vercel-inspired design aesthetic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (dark mode default)
- **Build Tool**: Vite with HMR support
- **Design System**: Linear/Vercel hybrid aesthetic with Inter font family, custom border radius, and elevation-based interaction states

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for development
- **API Pattern**: REST endpoints prefixed with `/api`
- **Static Serving**: Production builds served from `dist/public`
- **Development**: Vite middleware integration for HMR

### Compiler Architecture (compiler-v0)
- **Purpose**: Processes "sleeve" configurations containing blocks, stacks, triggers, and governance rules
- **Pipeline Stages** (10-step deterministic pipeline):
  1. Schema validation (sleeve requires id, blocks[], stacks[])
  2. Block dedup + moltType/role validation
  3. Stack references validation
  4. `normalizeSegments` - validates bundle/merge segment definitions
  5. `applyMerges` - substitutes merge source blocks with resultBlock
  6. `applyBundles` - records bundles for runtime (no substitution)
  7. `applyGovernance` - applies forbid/require/prefer/limit, builds priorityOverrides map
  8. Filter live blocks (exclude forbidden + role=off)
  9. `resolveAuthority` - sorts blocks by MOLT then priorityGroup + priorityOrder
  10. Selection phases: selectPrimary, selectDirective, selectInstruction, selectSubject, selectBlueprint
  11. Build NeoBlocks, NeoStacks, PromptSpec, TagIndexes
- **MOLT Order**: trigger → directive → instruction → subject → primary → philosophy → blueprint
- **Priority Resolution System** (Phase 10):
  - **PriorityGroup** (categorical tier): Override > Explicit > Default > Fallback
  - Blocks without `priorityGroup` default to "Default"
  - **priorityOrder** (tie-breaker): lower number = higher priority (1 = highest)
  - Collision points: selectPrimary (required single), select* with intent=alternates bundles
  - Ambiguous priority (multiple blocks same group without priorityOrder) → FAIL with ERR_PRIORITY_AMBIGUOUS
  - Priority resolution trace events emitted with kind="priority_resolution"
- **Output**: RuntimeSpec with trace events for debugging
- **Canonical Path**: `/compiler-v0/src`

### Data Storage
- **Schema**: Drizzle ORM with PostgreSQL dialect
- **Current Tables**: Users table with id, username, password
- **Development Storage**: In-memory storage implementation (MemStorage)
- **Schema Location**: `shared/schema.ts` with Zod validation via drizzle-zod

### Build System
- **Client Build**: Vite outputs to `dist/public`
- **Server Build**: esbuild bundles server with selective dependency bundling for cold start optimization
- **Database Migrations**: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: Session storage for Express

### UI Framework
- **Radix UI**: Full suite of accessible primitive components (dialog, dropdown, tabs, etc.)
- **Tailwind CSS**: Utility-first styling with custom configuration
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management

### Development Tools
- **Vite**: Frontend build and development server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Production server bundling
- **TypeScript**: Type checking across client, server, and shared code

### Fonts (Google Fonts)
- Inter (primary)
- DM Sans
- Fira Code (monospace)
- Geist Mono
- Architects Daughter