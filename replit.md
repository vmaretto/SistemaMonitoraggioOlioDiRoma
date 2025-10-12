# Overview

The Sistema Monitoraggio Olio (Oil Monitoring System) is a comprehensive reputation monitoring and label verification platform for the Consorzio Olio Roma-Lazio. It focuses on monitoring online reputation, tracking mentions of oil-related brands, and implementing an inspector activity tracking workflow for quality control reports.

The application serves as a centralized hub for analyzing online content sentiment, managing keywords for brand monitoring, and handling the complete lifecycle of quality inspection reports through a state machine-based workflow system. Its business vision is to provide a robust solution for ensuring product authenticity and brand integrity in the olive oil market, with market potential in agricultural consortia and food industries. The project ambitions include becoming a leading platform for food product reputation management and counterfeit detection.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 13+ with App Router using TypeScript
- **UI Library**: Tailwind CSS with shadcn/ui for consistent design
- **Component Structure**: React Server Components pattern
- **State Management**: React hooks and context, NextAuth.js for authentication
- **Charts**: Recharts for data visualization

## Backend Architecture
- **API Layer**: Next.js API routes (RESTful endpoints)
- **Authentication**: NextAuth.js with credentials provider (bcryptjs for password hashing)
- **Database Access**: Prisma ORM
- **Database**: SQLite for development
- **Session Management**: JWT-based sessions via NextAuth.js

## Data Storage Solutions
- **Primary Database**: SQLite with Prisma schema
- **Schema Design**: Comprehensive data model including users, content monitoring, keywords, and inspector workflow.
- **Key Models**: User management (ADMIN, ANALYST, INSPECTOR), Content monitoring, Keywords management, Report workflow system.

## Authentication and Authorization
- **Strategy**: Credential-based authentication (email/password)
- **Security**: bcryptjs password hashing, secure session management
- **Role System**: Three-tier access control (Admin, Analyst, Inspector)
- **Session Handling**: JWT tokens with automatic refresh

## Core Features Architecture

### Reputation Monitoring System
- **Content Analysis**: AI-powered sentiment analysis using OpenAI GPT-5
- **Keyword Matching**: Automated relevance scoring and detection
- **Data Sources**: Webz.io and SerpApi integration
- **Real-time Sync**: Scheduled synchronization service

### Label Verification System
- **Dual-Layer Verification**: 50% textual matching + 50% visual similarity scoring
- **OCR Technology**: GPT-5 Vision for text extraction
- **Textual Matching**: Comparison against official repository (nome, produttore, denominazione, regione)
- **Visual Matching**: GPT-5 Vision for detecting visual differences
- **Scoring Algorithm**: Combined score = (textualMatchScore * 0.5) + (visualSimilarity * 0.5)
- **Alert System**: Automatic alerts for non-compliant or suspicious labels
- **Image Storage**: Data URL persistence in PostgreSQL TEXT fields (for uploaded images)
- **Violation Detection**: DOP/IGP compliance, textual mismatches, and visual discrepancies
- **Performance Optimization**: Textual pre-selection across all labels, then visual comparison on the best textual match.

#### Smart Image Detection & Semi-Automatic Verification
- **Automatic Image Detection**: Extracts image URLs from monitored content during ingestion
  - Pattern matching: Direct URLs, HTML `<img>` tags, OpenGraph metadata (`og:image`), Twitter cards (`twitter:image`)
  - Storage: `imageUrl` and `metadata` fields in `ContenutiMonitorati` table
- **Visual Indicators**: Content list displays 📷 "Contiene Immagine" badge for items with detected images
- **One-Click Verification**: 🔍 "Verifica Etichetta" button launches verification workflow directly from content
- **Real-time Progress Tracking**: Server-Sent Events (SSE) provide live updates during verification process
- **Content-Verification Linking**: `contenutoMonitoratoId` field in `VerificheEtichette` tracks source content
- **Result Display**: Verification results shown inline with badges (✅ conforme / ❌ non_conforme / ⚠️ sospetta)
- **Dual Verification Modes**: 
  - Database-verified URLs: Uses pre-validated `imageUrl` from monitored content
  - Manual upload: Traditional file upload for user-provided images
- **SSRF Protection**: Multi-layer security for URL-based verification
  - DNS resolution with private IP blocking via ipaddr.js (RFC-compliant)
  - Blocked ranges: private, loopback, linkLocal, broadcast, reserved, carrierGradeNat, uniqueLocal
  - Userinfo blocking (prevents `user:pass@host` attacks)
  - Direct IP blocking (requires domain names only)
  - Redirect blocking (manual redirect handling with 3xx rejection)
  - 10MB size limit
  - **Known Limitations**: TOCTOU (Time-of-Check-Time-of-Use) and DNS rebinding vulnerabilities exist but are acceptable for authenticated internal users (Admin/Analyst roles only). Custom HTTP agent required for complete mitigation.

### Inspector Workflow System
- **State Machine**: Report lifecycle management with predefined transitions (e.g., ANALISI → ARCHIVIATA, IN_CONTROLLO).
- **Report States**: Comprehensive set of states for managing reports.
- **Audit Trail**: Append-only ActionLog for traceability.
- **File Management**: Attachment system for evidence.
- **Role-Based Access**: Inspector, Analyst, and Admin roles.
- **API Coverage**: Complete REST API for workflow operations.
- **User Interface**: Full dashboard integration with report listing and management.
- **Validation**: Comprehensive state transition validation.

### Dashboard and Analytics
- **Metrics Visualization**: Real-time statistics and trend analysis
- **Interactive Charts**: Sentiment distribution, keyword performance, and timeline views
- **Responsive Design**: Mobile-first approach

# External Dependencies

### Third-party APIs
- **OpenAI**: GPT-5 for sentiment analysis, GPT-5 Vision for OCR and visual matching (requires OPENAI_API_KEY)
- **Webz.io**: News and content monitoring service
- **SerpApi**: Google News search integration

### Development Tools
- **TypeScript**: Full type safety
- **ESBuild**: Fast bundling and compilation
- **Prisma**: Database schema management and migrations
- **TSX**: TypeScript execution for scripts

### UI and Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Framer Motion**: Animation library