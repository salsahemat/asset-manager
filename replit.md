# OrbitPM - Project Management Application

## Overview
OrbitPM is a full-featured project management platform with workspace management, multi-view boards (Kanban/Table/Calendar), task tracking with priorities/labels/assignees/checklists, comments, activity logging, notifications, workspace invites, global search with command palette, enhanced dashboard with charts, file attachments, task cover images, @mentions, group chat with reactions, and questions/polls module. Uses Replit Auth for authentication with multi-tenant workspace access control.

## Recent Changes
- 2026-02-10: Added role-based member permissions (owner/admin vs member) with backend enforcement and frontend UI
- 2026-02-10: Task delete restricted to owners/admins, task edit/move restricted to owner/admin or creator/assignee
- 2026-02-10: Settings page shows Roles & Permissions section, invite/member management restricted to owners
- 2026-02-09: Added group chat system with rooms, messages, emoji reactions, and 5-second polling
- 2026-02-09: Added questions/polls module with admin creation, responses, analytics, and reminders
- 2026-02-09: Added file attachments to tasks with upload/download/delete (10MB limit, type filtering)
- 2026-02-09: Added task cover images from image attachments, displayed on Kanban cards
- 2026-02-09: Added @mention system in comments and chat with notification generation
- 2026-02-09: Enhanced dashboard with recharts (bar chart for status, pie chart for priority, progress bars for assignees)
- 2026-02-09: Added multi-view support: Kanban, Table, Calendar views with filter toolbar
- 2026-02-09: Task detail drawer (Sheet) with inline editing, checklists, comments, activity timeline
- 2026-02-09: Notification system with bell icon, unread count badge, mark-as-read
- 2026-02-09: Workspace invite system with token-based acceptance flow
- 2026-02-09: Command palette (Ctrl+K or /) for global search and navigation
- 2026-02-09: Activity logging on task mutations
- 2026-02-09: Full application built - schema, backend API, frontend components, authorization middleware

## Tech Stack
- **Backend**: Express.js with TypeScript
- **Frontend**: React + Vite with TailwindCSS + Shadcn UI
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OIDC-based)
- **Routing**: wouter (frontend)
- **Data Fetching**: @tanstack/react-query v5
- **Charts**: recharts
- **File Upload**: multer (disk storage, 10MB limit)

## Project Architecture

### Backend
- `server/index.ts` - Server entry point
- `server/routes.ts` - All API routes with auth middleware, multer file upload
- `server/storage.ts` - Database storage interface and implementation
- `server/replit_integrations/auth.ts` - Replit Auth setup

### Shared
- `shared/schema.ts` - Drizzle schema definitions, relations, types, and Zod insert schemas
- `shared/models/auth.ts` - User model from Replit Auth

### Frontend
- `client/src/App.tsx` - Root app with routing, sidebar, workspace management
- `client/src/pages/landing.tsx` - Landing page for unauthenticated users
- `client/src/pages/home.tsx` - Dashboard with stats, charts, and board cards
- `client/src/pages/board.tsx` - Board page with Kanban/Table/Calendar views, filter toolbar, task cover images
- `client/src/pages/settings.tsx` - Workspace settings, members, invites, labels
- `client/src/pages/chat.tsx` - Group chat with rooms, messages, reactions, polling
- `client/src/pages/questions.tsx` - Questions/polls module with responses, analytics, reminders
- `client/src/pages/invite.tsx` - Invite acceptance page (/invite/:token)
- `client/src/components/app-sidebar.tsx` - Sidebar with workspace switcher, board list, chat, questions links
- `client/src/components/task-detail-dialog.tsx` - Task detail drawer with attachments, cover images, mentions, details/activity tabs
- `client/src/components/notification-bell.tsx` - Notification bell with dropdown
- `client/src/components/command-palette.tsx` - Global search command palette (Ctrl+K or /)
- `client/src/components/create-workspace-dialog.tsx` - Create workspace dialog
- `client/src/components/create-board-dialog.tsx` - Create board dialog
- `client/src/components/theme-toggle.tsx` - Light/dark theme toggle
- `client/src/hooks/use-auth.ts` - Authentication hook

### Database Schema
Tables: users, workspaces, workspace_members, boards, columns, tasks, task_assignees, task_labels, labels, comments, activity_logs, notifications, workspace_invites, checklist_items, attachments, chat_rooms, chat_messages, chat_reactions, questions, question_responses

### Key Features
- **File Attachments**: Upload to tasks via multer (uploads/ directory), 10MB limit, mime type filtering
- **Cover Images**: Set image attachments as task covers, displayed on Kanban cards
- **@Mentions**: Format @[Name](userId) parsed server-side, creates notifications for mentioned users
- **Group Chat**: Polling-based (5s interval), reactions (thumbs_up, heart, laugh, thinking, fire)
- **Questions/Polls**: Admin-only creation, short answer/multiple choice/poll types, reminders for non-responders

### API Routes
All routes require authentication. Workspace-scoped routes also require membership via `requireWorkspaceMember` middleware. Task-scoped routes use `requireTaskMember` middleware.

Key patterns:
- Query keys use arrays: `["/api/workspaces", workspaceId, "boards"]`
- Default fetcher joins array keys into URL path
- Workspace ID stored in localStorage for persistence
- Boards auto-create 3 default columns (To Do, In Progress, Done)
- Workspaces auto-create 4 default labels
- Notifications auto-poll unread count every 30 seconds
- Task detail drawer uses Sheet component with max-w-xl
- Filter system uses priority/assignee/label dropdowns with "all" default
- File uploads use FormData with multipart/form-data
- Attachment downloads are auth-guarded with workspace membership check
