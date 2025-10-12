# Overview

The Sistema Monitoraggio Olio (Oil Monitoring System) is a comprehensive reputation monitoring and label verification platform designed for the Consorzio Olio Roma-Lazio. The system focuses on monitoring online reputation, tracking mentions of oil-related brands, and implementing an inspector activity tracking workflow for quality control reports.

The application serves as a centralized hub for analyzing online content sentiment, managing keywords for brand monitoring, and handling the complete lifecycle of quality inspection reports through a state machine-based workflow system.

## Recent Changes

- **October 12, 2025**: ✅ **COMPLETED Migration from AbacusAI to OpenAI GPT-5 + Performance Optimization**
  - Replaced all AbacusAI integrations with OpenAI GPT-5 and GPT-5 Vision
  - Implemented dual-layer label verification: 50% textual matching + 50% visual similarity
  - Added per-label textual comparison with `compareTextWithOfficialLabel()`
  - Enhanced visual matching with `compareLabelsVisually()` using GPT-5 Vision
  - Migrated sentiment analysis to OpenAI GPT-5 with structured JSON responses
  - Updated database schema to support data URL storage (TEXT fields) for uploaded images
  
  **🚀 Performance Optimization (Final)**:
  - **Ultra-fast verification**: Reduced visual comparisons from 12 → 1 (only best textual match)
  - **Two-phase approach**: Textual pre-selection across all labels → visual comparison on winner
  - **API timeout**: Extended to 120 seconds for complex OpenAI Vision calls
  - **Detailed logging**: Step-by-step console logs (OCR, conformity, matching, finalization)
  - **User feedback**: Real-time progress bar with 5 step messages during analysis
  - **Estimated time**: 30-40 seconds per verification (vs. previous timeout issues)
  - **Frontend timeout**: 120s AbortController with proper cleanup and error handling
  - Removed legacy AbacusAI code and deprecated functions

- **December 28, 2025**: Completed full implementation of Inspector Activity Tracking ("Tracciabilità attività ispettori")
- **Major Feature**: Complete workflow system for managing quality inspection reports from initial analysis through final closure
- **Database Extension**: Extended Prisma schema with 6 new models (Report, ActionLog, Inspection, ClarificationRequest, AuthorityNotice, Attachment)
- **API Suite**: Implemented 12+ RESTful API endpoints with full validation and state transition management
- **User Interface**: Added comprehensive UI with dashboard integration, report listing, and detailed workflow management
- **State Management**: Enforced workflow state machine with proper transition validation and audit trail

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 13+ with App Router architecture using TypeScript
- **UI Library**: Tailwind CSS with shadcn/ui component library for consistent design
- **Component Structure**: Server and client components following React Server Components pattern
- **State Management**: React hooks and context for client-side state, with NextAuth.js for authentication state
- **Charts**: Recharts library for data visualization and analytics dashboards

## Backend Architecture
- **API Layer**: Next.js API routes providing RESTful endpoints
- **Authentication**: NextAuth.js with credentials provider using bcryptjs for password hashing
- **Database Access**: Prisma ORM for type-safe database operations
- **Database**: SQLite for development with Prisma migrations
- **Session Management**: JWT-based sessions through NextAuth.js

## Data Storage Solutions
- **Primary Database**: SQLite with Prisma schema defining core entities
- **Schema Design**: Comprehensive data model including users, content monitoring, keywords, and inspector workflow system
- **Key Models**: 
  - User management with role-based access (ADMIN, ANALYST, INSPECTOR)
  - Content monitoring for sentiment analysis and brand tracking
  - Keywords management for automated content filtering
  - Report workflow system with state machine implementation

## Authentication and Authorization
- **Strategy**: Credential-based authentication with email/password
- **Security**: bcryptjs password hashing with secure session management
- **Role System**: Three-tier access control (Admin, Analyst, Inspector)
- **Session Handling**: JWT tokens with automatic session refresh

## Core Features Architecture

### Reputation Monitoring System
- **Content Analysis**: AI-powered sentiment analysis using OpenAI GPT-5
- **Keyword Matching**: Automated relevance scoring and keyword detection
- **Data Sources**: Webz.io and SerpApi integration for multi-provider data aggregation
- **Real-time Sync**: Scheduled synchronization service for external data
- **Provider Status**: Visual indicators for demo vs real data sources

### Label Verification System ✅ COMPLETED
- **Dual-Layer Verification**: 50% textual matching + 50% visual similarity scoring
- **OCR Technology**: GPT-5 Vision for text extraction from uploaded labels
- **Textual Matching**: Per-label comparison against official repository (nome, produttore, denominazione, regione)
- **Visual Matching**: GPT-5 Vision comparison for detecting visual differences and counterfeits
- **Scoring Algorithm**: Combined score = (textualMatchScore * 0.5) + (visualSimilarity * 0.5)
- **Alert System**: Automatic alerts for non-compliant or suspicious labels
- **Image Storage**: Data URL persistence in PostgreSQL TEXT fields
- **Violation Detection**: DOP/IGP compliance, textual mismatches, and visual discrepancies

### Inspector Workflow System ✅ COMPLETED
- **State Machine**: Comprehensive report lifecycle management with predefined transitions
- **Report States**: ANALISI → ARCHIVIATA, IN_CONTROLLO, VERIFICA_SOPRALLUOGO, VERIFICA_CHIARIMENTS, SEGNALATA_A_ENTE, IN_ATTESA_FEEDBACK_ENTE, CHIUSA
- **Audit Trail**: Append-only ActionLog for complete traceability with timestamped entries
- **File Management**: Attachment system for evidence and documentation across all workflow entities
- **Role-Based Access**: Inspector, Analyst, and Admin roles with appropriate permissions
- **API Coverage**: Complete REST API with 12+ endpoints for all workflow operations
- **User Interface**: Full dashboard integration with report listing, filtering, and detailed workflow management
- **Validation**: Comprehensive state transition validation and business logic enforcement

### Dashboard and Analytics
- **Metrics Visualization**: Real-time statistics and trend analysis
- **Interactive Charts**: Sentiment distribution, keyword performance, and timeline views
- **Responsive Design**: Mobile-first approach with adaptive layouts

## External Dependencies

### Third-party APIs
- **OpenAI**: GPT-5 for sentiment analysis, GPT-5 Vision for OCR and visual matching (requires OPENAI_API_KEY)
- **Webz.io**: News and content monitoring service
- **SerpApi**: Google News search integration

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast bundling and compilation
- **Prisma**: Database schema management and migrations
- **TSX**: TypeScript execution for scripts and seed data

### UI and Styling
- **Radix UI**: Accessible component primitives for form controls and interactions
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Icon library for consistent iconography
- **Framer Motion**: Animation library for smooth user interactions

### Deployment Configuration
- **Environment Variables**: Secure configuration for API keys and database connections
- **Next.js Config**: Custom build settings for Replit deployment compatibility
- **Hot Reload**: Development server with live reloading on port 5000