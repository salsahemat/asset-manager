# Mesa Figma Prototype Spec

Figma file:
https://www.figma.com/design/oT2WflGrphoZYkEzFu7Spe/Untitled?t=cdAxi7B0lo0myV1j-1

## Prototype Goal

Create a public, clickable portfolio prototype for Mesa, a team project-management platform. The prototype should demonstrate the core user journey without requiring a real backend login.

Recommended Figma share setting:
Anyone with the link can view.

## Frame Setup

Use desktop frames at 1440 x 1024.

Create these pages:

- Cover
- Prototype
- Components

Create these main prototype frames:

1. Landing
2. Login
3. Register
4. Dashboard
5. Kanban Board
6. Task Detail
7. Chat
8. Questions
9. Attendance
10. Settings

Use these colors:

- Background: #F7F8FA
- Surface: #FFFFFF
- Text: #111827
- Muted text: #6B7280
- Border: #E5E7EB
- Primary: #2563EB
- Success: #16A34A
- Warning: #F59E0B
- Danger: #DC2626
- Purple accent: #7C3AED

Use Inter or SF Pro as the font.

## Global Layout

Authenticated screens use the same shell:

- Left sidebar, width 256
- Top bar, height 56
- Main content area

Sidebar content:

- Logo: Mesa
- Workspace selector: Product Team
- Navigation:
  - Dashboard
  - Boards
  - Chat
  - Questions
  - Attendance
  - Settings
- Board list:
  - Website Redesign
  - Mobile App Sprint
  - Marketing Launch
- Bottom user profile:
  - Salsa
  - Owner

Top bar content:

- Search field: Search tasks, boards, messages...
- New button
- Notification bell
- Theme toggle
- Profile avatar

## Frame 1: Landing

Purpose:
Introduce the product and route users into the demo.

Layout:

- Top navigation with Mesa logo, Log in button, Get started button
- Hero section:
  - Heading: Mesa
  - Subheading: Organize your work, ship faster together.
  - Body: A collaborative project-management workspace for boards, tasks, team chat, polls, files, and attendance.
  - Primary button: Try Prototype
  - Secondary button: View Dashboard
- Product preview image/card showing three Kanban columns:
  - To Do
  - In Progress
  - Done
- Feature row:
  - Team workspaces
  - Kanban and task tracking
  - Chat, polls, and attendance

Prototype links:

- Try Prototype -> Dashboard
- View Dashboard -> Dashboard
- Log in -> Login
- Get started -> Register

## Frame 2: Login

Purpose:
Show auth flow without requiring real credentials.

Layout:

- Centered auth panel
- Heading: Welcome back
- Email input: salsa@example.com
- Password input: ********
- Button: Log in
- Google button: Continue with Google
- Link: Create an account

Prototype links:

- Log in -> Dashboard
- Continue with Google -> Dashboard
- Create an account -> Register

## Frame 3: Register

Purpose:
Show onboarding entry.

Layout:

- Centered auth panel
- Heading: Create your account
- Name input: Salsa
- Email input: salsa@example.com
- Password input: ********
- Button: Create account
- Link: Already have an account?

Prototype links:

- Create account -> Dashboard
- Already have an account -> Login

## Frame 4: Dashboard

Purpose:
Give a portfolio-friendly overview of the product.

Content:

- Page title: Dashboard
- Subtitle: Product Team workspace overview
- Stat cards:
  - Active boards: 3
  - Open tasks: 24
  - Completed this week: 11
  - Team members: 8
- Chart area:
  - Tasks by status bar chart
  - Priority split pie chart
- Board cards:
  - Website Redesign
    - 12 tasks
    - 68% complete
  - Mobile App Sprint
    - 8 tasks
    - 42% complete
  - Marketing Launch
    - 4 tasks
    - 75% complete
- Recent activity list:
  - Maya moved "Homepage QA" to Done
  - Arif commented on "Design handoff"
  - Salsa uploaded a task attachment

Prototype links:

- Website Redesign card -> Kanban Board
- New button -> Kanban Board
- Sidebar Boards -> Kanban Board
- Sidebar Chat -> Chat
- Sidebar Questions -> Questions
- Sidebar Attendance -> Attendance
- Sidebar Settings -> Settings

## Frame 5: Kanban Board

Purpose:
Show the central project-management workflow.

Content:

- Page title: Website Redesign
- View tabs:
  - Kanban
  - Table
  - Calendar
- Filter toolbar:
  - Priority
  - Assignee
  - Label
- Columns:
  - To Do
    - Audit current homepage
    - Prepare copy deck
    - Collect product screenshots
  - In Progress
    - Design new hero section
    - Implement landing page
  - Review
    - Design handoff
  - Done
    - Sitemap approval
    - Brand asset cleanup

Task card details:

- Priority badge
- Assignee avatars
- Checklist count
- Comment count
- Attachment count

Prototype links:

- Any task card -> Task Detail
- Sidebar Dashboard -> Dashboard
- Sidebar Chat -> Chat
- Sidebar Questions -> Questions
- Sidebar Attendance -> Attendance
- Sidebar Settings -> Settings

## Frame 6: Task Detail

Purpose:
Show depth of task management.

Layout:

- Board remains visible in background with a right-side drawer or centered modal.

Task:
Design new hero section

Content:

- Status: In Progress
- Priority: High
- Assignees: Salsa, Maya
- Due date: May 12, 2026
- Labels:
  - Design
  - Website
- Description:
  Create a polished first-screen experience for the Mesa landing page with a clear product signal and direct CTA.
- Checklist:
  - Define hero copy
  - Select product preview
  - Prepare responsive layout
  - Review with team
- Attachments:
  - hero-reference.png
  - wireframe.pdf
- Comments:
  - Maya: The CTA should point directly to the dashboard demo.
  - Arif: I added the latest screenshots.
- Activity:
  - Task moved to In Progress
  - Salsa assigned Maya

Prototype links:

- Close icon -> Kanban Board
- Comment send button -> Task Detail

## Frame 7: Chat

Purpose:
Show team collaboration.

Content:

- Page title: Team Chat
- Room list:
  - General
  - Website Redesign
  - Design
  - Engineering
- Message area:
  - Salsa: Can we review the homepage task today?
  - Maya: Yes, I left notes in the task detail.
  - Arif: I uploaded the new reference files.
- Reaction chips:
  - Like
  - Heart
  - Fire
- Message input:
  - Write a message...

Prototype links:

- Sidebar Dashboard -> Dashboard
- Sidebar Boards -> Kanban Board
- Sidebar Questions -> Questions

## Frame 8: Questions

Purpose:
Show polls and async team questions.

Content:

- Page title: Questions & Polls
- Primary button: New Question
- Cards:
  - Which homepage direction should we use?
    - Option A: Product preview first
    - Option B: Customer story first
    - Option C: Feature grid first
    - Result: Product preview first, 62%
  - Are we ready for design handoff?
    - Yes: 5
    - Not yet: 2
- Analytics side panel:
  - Response rate: 87%
  - Pending responses: 1

Prototype links:

- Sidebar Dashboard -> Dashboard
- Sidebar Boards -> Kanban Board
- Sidebar Chat -> Chat

## Frame 9: Attendance

Purpose:
Show team operations beyond task boards.

Content:

- Page title: Attendance
- Today card:
  - Tuesday, May 5, 2026
  - Checked in: 7
  - Away: 1
- Table:
  - Salsa, Checked in, 09:02
  - Maya, Checked in, 09:10
  - Arif, Away, -
  - Nia, Checked in, 08:54
- Button: Check in
- Button: Export

Prototype links:

- Sidebar Dashboard -> Dashboard
- Sidebar Boards -> Kanban Board
- Sidebar Settings -> Settings

## Frame 10: Settings

Purpose:
Show workspace administration and roles.

Content:

- Page title: Workspace Settings
- Workspace profile:
  - Name: Product Team
  - Description: Product, design, and engineering workspace.
- Members table:
  - Salsa, Owner
  - Maya, Admin
  - Arif, Member
  - Nia, Member
- Invite section:
  - Email input
  - Role dropdown
  - Send invite button
- Roles & permissions section:
  - Owner/Admin can manage members and delete tasks
  - Members can edit assigned or created tasks
- Labels:
  - Design
  - Engineering
  - Marketing
  - Urgent

Prototype links:

- Sidebar Dashboard -> Dashboard
- Sidebar Boards -> Kanban Board

## Component Checklist

Create reusable components:

- Sidebar item
- Top bar button
- Stat card
- Board card
- Kanban column
- Task card
- Badge
- Avatar group
- Modal/drawer
- Chat message
- Poll card
- Member table row

## Figma Prototype Settings

Set the prototype starting point to Landing.

Use these interactions:

- On click -> Navigate to
- Animation: Smart Animate or Dissolve
- Duration: 200ms
- Modal open: Open overlay
- Modal close: Close overlay

Recommended public demo path:

Landing -> Dashboard -> Kanban Board -> Task Detail -> Chat -> Questions -> Attendance -> Settings

## Portfolio Copy

Short version:

Mesa is a collaborative project-management platform for teams. It combines workspaces, Kanban boards, task details, file attachments, notifications, group chat, team questions, attendance, and role-based workspace settings in one focused product experience.

Long version:

Mesa is a full-stack productivity platform designed for modern teams managing projects across design, engineering, and operations. The app supports multi-workspace collaboration, Kanban boards, task assignments, comments, attachments, notifications, chat rooms, polls, attendance tracking, and member permissions. This prototype demonstrates the main product journey from landing page to dashboard, board management, task collaboration, and workspace administration.

