import {
  type Workspace, type InsertWorkspace, workspaces,
  type Board, type InsertBoard, boards,
  type Column, type InsertColumn, columns,
  type Task, type InsertTask, tasks,
  type Label, type InsertLabel, labels,
  type Comment, type InsertComment, comments,
  type WorkspaceMember, workspaceMembers,
  type TaskAssignee, taskAssignees,
  type TaskLabel, taskLabels,
  type ActivityLog, activityLogs,
  type ChecklistItem, type InsertChecklistItem, checklistItems,
  type Notification, type InsertNotification, notifications,
  type WorkspaceInvite, type InsertWorkspaceInvite, workspaceInvites,
  type Attachment, type InsertAttachment, attachments,
  type ChatRoom, type InsertChatRoom, chatRooms,
  type ChatMessage, type InsertChatMessage, chatMessages,
  type ChatReaction, type InsertChatReaction, chatReactions,
  type Question, type InsertQuestion, questions,
  type QuestionResponse, type InsertQuestionResponse, questionResponses,
} from "../shared/schema";
import { type User, type UpsertUser, users } from "../shared/models/auth";
import { db, pool } from "./db";
import { eq, and, desc, asc, sql, count, lt, ilike, or } from "drizzle-orm";
import { inArray } from "drizzle-orm";
import { formatDateKey } from "./date";
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getWorkspacesForUser(userId: string): Promise<Workspace[]>;
  createWorkspace(data: { name: string; slug: string; iconColor?: string; ownerId: string }): Promise<Workspace>;
  getWorkspace(id: string): Promise<Workspace | undefined>;
  addWorkspaceMember(workspaceId: string, userId: string, role: string): Promise<WorkspaceMember>;
  getWorkspaceMembers(workspaceId: string): Promise<(WorkspaceMember & { user: User })[]>;
  getWorkspaceMemberRole(workspaceId: string, userId: string): Promise<string | null>;
  getBoardsForWorkspace(workspaceId: string): Promise<Board[]>;
  createBoard(data: InsertBoard): Promise<Board>;
  getBoard(id: string): Promise<Board | undefined>;
  updateBoard(id: string, data: Partial<Board>): Promise<Board>;
  deleteBoard(id: string): Promise<void>;
  getColumnsForBoard(boardId: string): Promise<Column[]>;
  createColumn(data: InsertColumn): Promise<Column>;
  deleteColumn(id: string): Promise<void>;
  getTasksForBoard(boardId: string): Promise<any[]>;
  getTasksForBoardForUser(boardId: string, userId: string): Promise<any[]>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  moveTask(id: string, columnId: string, position: number): Promise<void>;
  getTask(id: string): Promise<Task | undefined>;
  getCommentsForTask(taskId: string): Promise<(Comment & { user: User })[]>;
  createComment(data: InsertComment): Promise<Comment>;
  getLabelsForWorkspace(workspaceId: string): Promise<Label[]>;
  createLabel(data: InsertLabel): Promise<Label>;
  deleteLabel(id: string): Promise<void>;
  getWorkspaceStats(workspaceId: string): Promise<{ total: number; completed: number; overdue: number }>;
  getWorkspaceDetailedStats(workspaceId: string): Promise<any>;
  getUserPerformance(workspaceId: string, userId: string): Promise<any>;
  isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean>;
  isTaskAssignee(taskId: string, userId: string): Promise<boolean>;
  addTaskAssignee(taskId: string, userId: string): Promise<TaskAssignee>;
  removeTaskAssignee(taskId: string, userId: string): Promise<void>;
  addTaskLabel(taskId: string, labelId: string): Promise<TaskLabel>;
  removeTaskLabel(taskId: string, labelId: string): Promise<void>;
  getWorkspaceIdForBoard(boardId: string): Promise<string | null>;
  getWorkspaceIdForTask(taskId: string): Promise<string | null>;
  getWorkspaceIdForColumn(columnId: string): Promise<string | null>;
  getWorkspaceIdForLabel(labelId: string): Promise<string | null>;
  getChecklistItems(taskId: string): Promise<ChecklistItem[]>;
  createChecklistItem(data: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: string, data: Partial<ChecklistItem>): Promise<ChecklistItem>;
  deleteChecklistItem(id: string): Promise<void>;
  createActivityLog(data: { workspaceId: string; taskId?: string; userId: string; action: string; entityType: string; entityId?: string; metadata?: any }): Promise<ActivityLog>;
  getActivityLogsForTask(taskId: string, limit?: number): Promise<(ActivityLog & { user: User })[]>;
  getActivityLogsForWorkspace(workspaceId: string, limit?: number): Promise<(ActivityLog & { user: User })[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  getNotificationsForUser(userId: string, workspaceId?: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string, workspaceId: string): Promise<void>;
  getUnreadNotificationCount(userId: string, workspaceId?: string): Promise<number>;
  createInvite(data: InsertWorkspaceInvite): Promise<WorkspaceInvite>;
  getInviteByToken(token: string): Promise<WorkspaceInvite | undefined>;
  getInvitesForWorkspace(workspaceId: string): Promise<WorkspaceInvite[]>;
  updateInviteStatus(id: string, status: string): Promise<void>;
  deleteInvite(id: string): Promise<void>;
  searchTasks(workspaceId: string, query: string): Promise<any[]>;
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<void>;
  updateWorkspaceMemberRole(workspaceId: string, userId: string, role: string): Promise<void>;
  searchWorkspaceMembers(workspaceId: string, query: string): Promise<(WorkspaceMember & { user: User })[]>;
  createAttachment(data: InsertAttachment): Promise<Attachment>;
  getAttachmentsForTask(taskId: string): Promise<(Attachment & { uploader: User })[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  deleteAttachment(id: string): Promise<void>;
  getChatRooms(workspaceId: string): Promise<ChatRoom[]>;
  createChatRoom(data: InsertChatRoom): Promise<ChatRoom>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  getChatMessages(roomId: string, limit?: number, before?: string): Promise<(ChatMessage & { user: User; reactions: (ChatReaction & { user: User })[] })[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  addChatReaction(data: InsertChatReaction): Promise<ChatReaction>;
  removeChatReaction(messageId: string, userId: string, emoji: string): Promise<void>;
  getQuestions(workspaceId: string): Promise<(Question & { creator: User; responseCount: number })[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  createQuestion(data: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question>;
  getQuestionResponses(questionId: string): Promise<(QuestionResponse & { user: User })[]>;
  createQuestionResponse(data: InsertQuestionResponse): Promise<QuestionResponse>;
  hasUserRespondedToQuestion(questionId: string, userId: string): Promise<boolean>;
  getQuestionNonResponders(questionId: string, workspaceId: string): Promise<User[]>;
  updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace>;
}

export class DatabaseStorage implements IStorage {
  private async buildTaskRelations(taskRows: Task[]): Promise<any[]> {
    const result = [];
    for (const task of taskRows) {
      const assigneeRows = await db
        .select()
        .from(taskAssignees)
        .innerJoin(users, eq(taskAssignees.userId, users.id))
        .where(eq(taskAssignees.taskId, task.id));

      const labelRows = await db
        .select()
        .from(taskLabels)
        .innerJoin(labels, eq(taskLabels.labelId, labels.id))
        .where(eq(taskLabels.taskId, task.id));

      const checklistRows = await db
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.taskId, task.id))
        .orderBy(asc(checklistItems.position));

      result.push({
        ...task,
        assignees: assigneeRows.map((r) => ({ user: r.users })),
        labels: labelRows.map((r) => ({ label: r.labels })),
        checklist: checklistRows,
      });
    }
    return result;
  }

  private async getWorkspaceBoardIds(workspaceId: string): Promise<string[]> {
    const boardRows = await db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.workspaceId, workspaceId));
    return boardRows.map((board) => board.id);
  }

  private async getDoneColumnIds(boardIds: string[]): Promise<string[]> {
    if (boardIds.length === 0) return [];
    const doneColumns = await db
      .select({ id: columns.id })
      .from(columns)
      .where(
        and(
          inArray(columns.boardId, boardIds),
          sql`LOWER(${columns.name}) IN ('done', 'completed', 'closed')`,
        ),
      );
    return doneColumns.map((column) => column.id);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAttendanceForWorkspace(
    workspaceId: string,
    year: number,
    month: number
  ): Promise<any[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = formatDateKey(new Date(year, month, 0));
    const result = await pool.query(
      `SELECT a.*, 
      u.first_name, u.last_name, u.email, u.profile_image_url
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE a.workspace_id = $1 AND a.date >= $2 AND a.date <= $3
     ORDER BY a.date DESC, u.first_name ASC`,
      [workspaceId, startDate, endDate]
    );
    return result.rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      date: r.date,
      status: r.status,
      checkIn: r.check_in,
      checkOut: r.check_out,
      note: r.note,
      checkInPhoto: r.check_in_photo,
      checkOutPhoto: r.check_out_photo,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      user: {
        id: r.user_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        profileImageUrl: r.profile_image_url,
      },
    }));
  }

  async getTodayAttendance(workspaceId: string, userId: string): Promise<any | null> {
    const today = formatDateKey(new Date());
    const result = await pool.query(
      `SELECT * FROM attendance WHERE workspace_id = $1 AND user_id = $2 AND date = $3`,
      [workspaceId, userId, today]
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      date: r.date,
      status: r.status,
      checkIn: r.check_in,
      checkOut: r.check_out,
      note: r.note,
      checkInPhoto: r.check_in_photo,
      checkOutPhoto: r.check_out_photo,
    };
  }

  async upsertAttendance(data: {
    workspaceId: string;
    userId: string;
    date: string;
    status: string;
    checkIn?: string | null;
    checkOut?: string | null;
    checkInPhoto?: string | null;
    checkOutPhoto?: string | null;
    note?: string | null;
  }): Promise<any> {
    const result = await pool.query(
      `INSERT INTO attendance (workspace_id, user_id, date, status, check_in, check_out, check_in_photo, check_out_photo, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (workspace_id, user_id, date)
     DO UPDATE SET
       status = EXCLUDED.status,
       check_in = COALESCE(EXCLUDED.check_in, attendance.check_in),
       check_out = COALESCE(EXCLUDED.check_out, attendance.check_out),
       check_in_photo = COALESCE(EXCLUDED.check_in_photo, attendance.check_in_photo),
       check_out_photo = COALESCE(EXCLUDED.check_out_photo, attendance.check_out_photo),
       note = EXCLUDED.note,
       updated_at = NOW()
     RETURNING *`,
      [data.workspaceId, data.userId, data.date, data.status,
      data.checkIn ?? null, data.checkOut ?? null, data.checkInPhoto ?? null, data.checkOutPhoto ?? null, data.note ?? null]
    );
    const r = result.rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      date: r.date,
      status: r.status,
      checkIn: r.check_in,
      checkOut: r.check_out,
      checkInPhoto: r.check_in_photo,
      checkOutPhoto: r.check_out_photo,
      note: r.note,
    };
  }

  async getWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const memberships = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId));
    if (memberships.length === 0) return [];
    const wsIds = memberships.map((m) => m.workspaceId);
    const result = await db
      .select()
      .from(workspaces)
      .where(sql`${workspaces.id} IN ${wsIds}`);
    return result;
  }

  async createWorkspace(data: { name: string; slug: string; iconColor?: string; ownerId: string }): Promise<Workspace> {
    const [ws] = await db.insert(workspaces).values(data).returning();
    return ws;
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return ws;
  }

  async addWorkspaceMember(workspaceId: string, userId: string, role: string): Promise<WorkspaceMember> {
    const [member] = await db.insert(workspaceMembers).values({ workspaceId, userId, role }).returning();
    return member;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<(WorkspaceMember & { user: User })[]> {
    const result = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    return result.map((r) => ({ ...r.workspace_members, user: r.users }));
  }

  async getWorkspaceMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    const [member] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    return member?.role || null;
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await db.delete(workspaceMembers).where(
      and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))
    );
  }

  async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: string): Promise<void> {
    await db.update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
  }

  async getBoardsForWorkspace(workspaceId: string): Promise<Board[]> {
    return db.select().from(boards).where(eq(boards.workspaceId, workspaceId)).orderBy(desc(boards.createdAt));
  }

  async createBoard(data: InsertBoard): Promise<Board> {
    const [board] = await db.insert(boards).values(data).returning();
    return board;
  }

  async getBoard(id: string): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.id, id));
    return board;
  }

  async updateBoard(id: string, data: Partial<Board>): Promise<Board> {
    const [board] = await db.update(boards).set(data).where(eq(boards.id, id)).returning();
    return board;
  }

  async deleteBoard(id: string): Promise<void> {
    await db.delete(boards).where(eq(boards.id, id));
  }

  async getColumnsForBoard(boardId: string): Promise<Column[]> {
    return db.select().from(columns).where(eq(columns.boardId, boardId)).orderBy(asc(columns.position));
  }

  async createColumn(data: InsertColumn): Promise<Column> {
    const existing = await db.select({ cnt: count() }).from(columns).where(eq(columns.boardId, data.boardId));
    const position = existing[0]?.cnt || 0;
    const [col] = await db.insert(columns).values({ ...data, position }).returning();
    return col;
  }

  async deleteColumn(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.columnId, id));
    await db.delete(columns).where(eq(columns.id, id));
  }

  async getTasksForBoard(boardId: string): Promise<any[]> {
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.boardId, boardId))
      .orderBy(asc(tasks.position));
    return this.buildTaskRelations(allTasks);
  }

  async getTasksForBoardForUser(boardId: string, userId: string): Promise<any[]> {
    const assignedTaskRows = await db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(eq(tasks.boardId, boardId), eq(taskAssignees.userId, userId)));

    const assignedTaskIds = assignedTaskRows.map((row) => row.taskId);
    const visibilityCondition =
      assignedTaskIds.length > 0
        ? or(eq(tasks.createdBy, userId), inArray(tasks.id, assignedTaskIds))
        : eq(tasks.createdBy, userId);
    const allTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.boardId, boardId), visibilityCondition))
      .orderBy(asc(tasks.position));
    return this.buildTaskRelations(allTasks);
  }

  async createTask(data: InsertTask): Promise<Task> {
    const existing = await db.select({ cnt: count() }).from(tasks).where(eq(tasks.columnId, data.columnId));
    const position = existing[0]?.cnt || 0;
    const [task] = await db.insert(tasks).values({ ...data, position }).returning();
    return task;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const [task] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(checklistItems).where(eq(checklistItems.taskId, id));
    await db.delete(comments).where(eq(comments.taskId, id));
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, id));
    await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async moveTask(id: string, columnId: string, position: number): Promise<void> {
    await db.update(tasks).set({ columnId, position }).where(eq(tasks.id, id));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTaskWithRelations(id: string): Promise<any | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;

    const assigneeRows = await db
      .select()
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, id));

    const labelRows = await db
      .select()
      .from(taskLabels)
      .innerJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(eq(taskLabels.taskId, id));

    return {
      ...task,
      assignees: assigneeRows.map((r) => ({ user: r.users })),
      labels: labelRows.map((r) => ({ label: r.labels })),
    };
  }

  async getCommentsForTask(taskId: string): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select()
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.taskId, taskId))
      .orderBy(asc(comments.createdAt));
    return result.map((r) => ({ ...r.comments, user: r.users }));
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async getLabelsForWorkspace(workspaceId: string): Promise<Label[]> {
    return db.select().from(labels).where(eq(labels.workspaceId, workspaceId));
  }

  async createLabel(data: InsertLabel): Promise<Label> {
    const [label] = await db.insert(labels).values(data).returning();
    return label;
  }

  async deleteLabel(id: string): Promise<void> {
    await db.delete(taskLabels).where(eq(taskLabels.labelId, id));
    await db.delete(labels).where(eq(labels.id, id));
  }

  async isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    return !!member;
  }

  async isTaskAssignee(taskId: string, userId: string): Promise<boolean> {
    const [row] = await db.select().from(taskAssignees).where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)));
    return !!row;
  }

  async addTaskAssignee(taskId: string, userId: string): Promise<TaskAssignee> {
    const [assignee] = await db.insert(taskAssignees).values({ taskId, userId }).returning();
    return assignee;
  }

  async removeTaskAssignee(taskId: string, userId: string): Promise<void> {
    await db.delete(taskAssignees).where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)));
  }

  async addTaskLabel(taskId: string, labelId: string): Promise<TaskLabel> {
    const [tl] = await db.insert(taskLabels).values({ taskId, labelId }).returning();
    return tl;
  }

  async removeTaskLabel(taskId: string, labelId: string): Promise<void> {
    await db.delete(taskLabels).where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)));
  }

  async getWorkspaceIdForBoard(boardId: string): Promise<string | null> {
    const [board] = await db.select({ workspaceId: boards.workspaceId }).from(boards).where(eq(boards.id, boardId));
    return board?.workspaceId || null;
  }

  async getWorkspaceIdForTask(taskId: string): Promise<string | null> {
    const [task] = await db.select({ boardId: tasks.boardId }).from(tasks).where(eq(tasks.id, taskId));
    if (!task) return null;
    return this.getWorkspaceIdForBoard(task.boardId);
  }

  async getWorkspaceIdForColumn(columnId: string): Promise<string | null> {
    const [col] = await db.select({ boardId: columns.boardId }).from(columns).where(eq(columns.id, columnId));
    if (!col) return null;
    return this.getWorkspaceIdForBoard(col.boardId);
  }

  async getWorkspaceIdForLabel(labelId: string): Promise<string | null> {
    const [label] = await db.select({ workspaceId: labels.workspaceId }).from(labels).where(eq(labels.id, labelId));
    return label?.workspaceId || null;
  }

  async getWorkspaceStats(workspaceId: string): Promise<{ total: number; completed: number; overdue: number }> {
    const boardIds = await this.getWorkspaceBoardIds(workspaceId);
    if (boardIds.length === 0) return { total: 0, completed: 0, overdue: 0 };

    const [totalResult] = await db
      .select({ cnt: count() })
      .from(tasks)
      .where(inArray(tasks.boardId, boardIds));

    const doneIds = await this.getDoneColumnIds(boardIds);

    let completed = 0;
    if (doneIds.length > 0) {
      const [completedResult] = await db
        .select({ cnt: count() })
        .from(tasks)
        .where(inArray(tasks.columnId, doneIds));
      completed = completedResult?.cnt || 0;
    }

    const [overdueResult] = await db
      .select({ cnt: count() })
      .from(tasks)
      .where(
        and(
          inArray(tasks.boardId, boardIds),
          lt(tasks.dueDate, new Date()),
          doneIds.length > 0 ? sql`${tasks.columnId} NOT IN ${doneIds}` : sql`TRUE`,
        )
      );

    return {
      total: totalResult?.cnt || 0,
      completed,
      overdue: overdueResult?.cnt || 0,
    };
  }

  async getWorkspaceDetailedStats(workspaceId: string): Promise<any> {
    const boardIds = await this.getWorkspaceBoardIds(workspaceId);
    if (boardIds.length === 0) {
      return { total: 0, completed: 0, overdue: 0, byStatus: [], byPriority: [], byAssignee: [], recentActivity: [] };
    }

    const basicStats = await this.getWorkspaceStats(workspaceId);

    const allCols = await db
      .select()
      .from(columns)
      .where(inArray(columns.boardId, boardIds))
      .orderBy(asc(columns.position));

    const statusCounts = await db
      .select({
        columnId: tasks.columnId,
        cnt: count()
      })
      .from(tasks)
      .where(inArray(tasks.boardId, boardIds))
      .groupBy(tasks.columnId);

    const byStatus = allCols.map(col => {
      const match = statusCounts.find(s => s.columnId === col.id);
      return {
        name: col.name,
        color: col.color,
        count: match?.cnt || 0
      };
    });

    const allTasks = await db.select().from(tasks).where(inArray(tasks.boardId, boardIds));
    const byPriority: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const t of allTasks) {
      const p = t.priority || "medium";
      byPriority[p] = (byPriority[p] || 0) + 1;
    }

    const assigneeStats = await db
      .select({ userId: taskAssignees.userId, cnt: count() })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(sql`${tasks.boardId} IN ${boardIds}`)
      .groupBy(taskAssignees.userId);

    const byAssignee = [];
    for (const as of assigneeStats) {
      const u = await this.getUser(as.userId);
      byAssignee.push({
        user: u ? { id: u.id, firstName: u.firstName, lastName: u.lastName, profileImageUrl: u.profileImageUrl } : null,
        count: as.cnt,
      });
    }

    return {
      ...basicStats,
      byStatus,
      byPriority: Object.entries(byPriority).map(([name, cnt]) => ({ name, count: cnt })),
      byAssignee,
    };
  }

  async getUserPerformance(workspaceId: string, userId: string): Promise<any> {
    const boardIds = await this.getWorkspaceBoardIds(workspaceId);
    if (boardIds.length === 0) {
      return {
        user: null,
        total: 0,
        completed: 0,
        overdue: 0,
        completionRate: 0,
        byPriority: [],
        byStatus: [],
        byAssignee: [],
        recentActivity: [],
      };
    }

    const user = await this.getUser(userId);
    const assignedTaskRows = await db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(inArray(tasks.boardId, boardIds), eq(taskAssignees.userId, userId)));
    const assignedTaskIds = assignedTaskRows.map((row) => row.taskId);
    const visibilityCondition =
      assignedTaskIds.length > 0
        ? or(eq(tasks.createdBy, userId), inArray(tasks.id, assignedTaskIds))
        : eq(tasks.createdBy, userId);

    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(inArray(tasks.boardId, boardIds), visibilityCondition));

    const doneIds = await this.getDoneColumnIds(boardIds);
    const byPriorityMap: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const task of userTasks) {
      const priority = task.priority || "medium";
      byPriorityMap[priority] = (byPriorityMap[priority] || 0) + 1;
    }

    const statusRows = await db
      .select({
        name: columns.name,
        color: columns.color,
        cnt: count(),
      })
      .from(tasks)
      .innerJoin(columns, eq(tasks.columnId, columns.id))
      .where(and(inArray(tasks.boardId, boardIds), visibilityCondition))
      .groupBy(columns.id, columns.name, columns.color)
      .orderBy(asc(columns.position));

    const total = userTasks.length;
    const completed = userTasks.filter((task) => doneIds.includes(task.columnId)).length;
    const overdue = userTasks.filter(
      (task) => task.dueDate && task.dueDate < new Date() && !doneIds.includes(task.columnId),
    ).length;

    return {
      user: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          }
        : null,
      total,
      completed,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      byPriority: Object.entries(byPriorityMap).map(([name, count]) => ({ name, count })),
      byStatus: statusRows.map((row) => ({
        name: row.name,
        color: row.color,
        count: row.cnt,
      })),
      byAssignee: [],
      recentActivity: [],
    };
  }

  async getChecklistItems(taskId: string): Promise<ChecklistItem[]> {
    return db.select().from(checklistItems).where(eq(checklistItems.taskId, taskId)).orderBy(asc(checklistItems.position));
  }

  async createChecklistItem(data: InsertChecklistItem): Promise<ChecklistItem> {
    const existing = await db.select({ cnt: count() }).from(checklistItems).where(eq(checklistItems.taskId, data.taskId));
    const position = existing[0]?.cnt || 0;
    const [item] = await db.insert(checklistItems).values({ ...data, position }).returning();
    return item;
  }

  async updateChecklistItem(id: string, data: Partial<ChecklistItem>): Promise<ChecklistItem> {
    const [item] = await db.update(checklistItems).set(data).where(eq(checklistItems.id, id)).returning();
    return item;
  }

  async deleteChecklistItem(id: string): Promise<void> {
    await db.delete(checklistItems).where(eq(checklistItems.id, id));
  }

  async createActivityLog(data: { workspaceId: string; taskId?: string; userId: string; action: string; entityType: string; entityId?: string; metadata?: any }): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(data).returning();
    return log;
  }

  async getActivityLogsForTask(taskId: string, limit = 50): Promise<(ActivityLog & { user: User })[]> {
    const result = await db
      .select()
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.taskId, taskId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
    return result.map((r) => ({ ...r.activity_logs, user: r.users }));
  }

  async getActivityLogsForWorkspace(workspaceId: string, limit = 50): Promise<(ActivityLog & { user: User })[]> {
    const result = await db
      .select()
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.workspaceId, workspaceId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
    return result.map((r) => ({ ...r.activity_logs, user: r.users }));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async getNotificationsForUser(userId: string, workspaceId?: string): Promise<Notification[]> {
    if (workspaceId) {
      return db.select().from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string, workspaceId: string): Promise<void> {
    await db.update(notifications).set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.workspaceId, workspaceId)));
  }

  async getUnreadNotificationCount(userId: string, workspaceId?: string): Promise<number> {
    const conditions = [eq(notifications.userId, userId), eq(notifications.read, false)];
    if (workspaceId) conditions.push(eq(notifications.workspaceId, workspaceId));
    const [result] = await db.select({ cnt: count() }).from(notifications).where(and(...conditions));
    return result?.cnt || 0;
  }

  async createInvite(data: InsertWorkspaceInvite): Promise<WorkspaceInvite> {
    const [invite] = await db.insert(workspaceInvites).values(data).returning();
    return invite;
  }

  async getInviteByToken(token: string): Promise<WorkspaceInvite | undefined> {
    const [invite] = await db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token));
    return invite;
  }

  async getInvitesForWorkspace(workspaceId: string): Promise<WorkspaceInvite[]> {
    return db.select().from(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.status, "pending")))
      .orderBy(desc(workspaceInvites.createdAt));
  }

  async updateInviteStatus(id: string, status: string): Promise<void> {
    await db.update(workspaceInvites).set({ status }).where(eq(workspaceInvites.id, id));
  }

  async deleteInvite(id: string): Promise<void> {
    await db.delete(workspaceInvites).where(eq(workspaceInvites.id, id));
  }

  async searchTasks(workspaceId: string, query: string): Promise<any[]> {
    const boardRows = await db.select({ id: boards.id }).from(boards).where(eq(boards.workspaceId, workspaceId));
    if (boardRows.length === 0) return [];
    const boardIds = boardRows.map((b) => b.id);

    const results = await db
      .select()
      .from(tasks)
      .innerJoin(boards, eq(tasks.boardId, boards.id))
      .innerJoin(columns, eq(tasks.columnId, columns.id))
      .where(
        and(
          sql`${tasks.boardId} IN ${boardIds}`,
          or(
            ilike(tasks.title, `%${query}%`),
            ilike(tasks.description, `%${query}%`)
          )
        )
      )
      .orderBy(desc(tasks.createdAt))
      .limit(20);

    return results.map((r) => ({
      ...r.tasks,
      board: r.boards,
      column: r.columns,
    }));
  }

  async searchWorkspaceMembers(workspaceId: string, query: string): Promise<(WorkspaceMember & { user: User })[]> {
    const result = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          query ? or(
            ilike(users.firstName, `%${query}%`),
            ilike(users.lastName, `%${query}%`),
            ilike(users.email, `%${query}%`)
          ) : sql`TRUE`
        )
      )
      .limit(10);
    return result.map((r) => ({ ...r.workspace_members, user: r.users }));
  }

  async updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace> {
    const [ws] = await db.update(workspaces).set(data).where(eq(workspaces.id, id)).returning();
    return ws;
  }

  async createAttachment(data: InsertAttachment): Promise<Attachment> {
    const [att] = await db.insert(attachments).values(data).returning();
    return att;
  }

  async getAttachmentsForTask(taskId: string): Promise<(Attachment & { uploader: User })[]> {
    const result = await db
      .select()
      .from(attachments)
      .innerJoin(users, eq(attachments.uploadedBy, users.id))
      .where(eq(attachments.taskId, taskId))
      .orderBy(desc(attachments.createdAt));
    return result.map((r) => ({ ...r.attachments, uploader: r.users }));
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const [att] = await db.select().from(attachments).where(eq(attachments.id, id));
    return att;
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  async getChatRooms(workspaceId: string): Promise<ChatRoom[]> {
    return db.select().from(chatRooms)
      .where(eq(chatRooms.workspaceId, workspaceId))
      .orderBy(asc(chatRooms.createdAt));
  }

  async createChatRoom(data: InsertChatRoom): Promise<ChatRoom> {
    const [room] = await db.insert(chatRooms).values(data).returning();
    return room;
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room;
  }

  async getChatMessages(roomId: string, limit = 50, before?: string): Promise<(ChatMessage & { user: User; reactions: (ChatReaction & { user: User })[] })[]> {
    const conditions = [eq(chatMessages.roomId, roomId)];
    if (before) {
      conditions.push(lt(chatMessages.createdAt, new Date(before)));
    }

    const msgs = await db
      .select()
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    const result = [];
    for (const m of msgs) {
      const reactionRows = await db
        .select()
        .from(chatReactions)
        .innerJoin(users, eq(chatReactions.userId, users.id))
        .where(eq(chatReactions.messageId, m.chat_messages.id));
      result.push({
        ...m.chat_messages,
        user: m.users,
        reactions: reactionRows.map((r) => ({ ...r.chat_reactions, user: r.users })),
      });
    }
    return result.reverse();
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  async addChatReaction(data: InsertChatReaction): Promise<ChatReaction> {
    const existing = await db
      .select()
      .from(chatReactions)
      .where(and(
        eq(chatReactions.messageId, data.messageId),
        eq(chatReactions.userId, data.userId),
        eq(chatReactions.emoji, data.emoji)
      ));
    if (existing.length > 0) return existing[0];
    const [reaction] = await db.insert(chatReactions).values(data).returning();
    return reaction;
  }

  async removeChatReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(chatReactions).where(
      and(
        eq(chatReactions.messageId, messageId),
        eq(chatReactions.userId, userId),
        eq(chatReactions.emoji, emoji)
      )
    );
  }

  async getQuestions(workspaceId: string): Promise<(Question & { creator: User; responseCount: number })[]> {
    const qs = await db
      .select()
      .from(questions)
      .innerJoin(users, eq(questions.creatorId, users.id))
      .where(eq(questions.workspaceId, workspaceId))
      .orderBy(desc(questions.createdAt));

    const result = [];
    for (const q of qs) {
      const [rc] = await db.select({ cnt: count() }).from(questionResponses).where(eq(questionResponses.questionId, q.questions.id));
      result.push({ ...q.questions, creator: q.users, responseCount: rc?.cnt || 0 });
    }
    return result;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    return q;
  }

  async createQuestion(data: InsertQuestion): Promise<Question> {
    const [q] = await db.insert(questions).values(data).returning();
    return q;
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const [q] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    return q;
  }

  async getQuestionResponses(questionId: string): Promise<(QuestionResponse & { user: User })[]> {
    const result = await db
      .select()
      .from(questionResponses)
      .innerJoin(users, eq(questionResponses.userId, users.id))
      .where(eq(questionResponses.questionId, questionId))
      .orderBy(asc(questionResponses.createdAt));
    return result.map((r) => ({ ...r.question_responses, user: r.users }));
  }

  async createQuestionResponse(data: InsertQuestionResponse): Promise<QuestionResponse> {
    const [r] = await db.insert(questionResponses).values(data).returning();
    return r;
  }

  async hasUserRespondedToQuestion(questionId: string, userId: string): Promise<boolean> {
    const [r] = await db.select().from(questionResponses)
      .where(and(eq(questionResponses.questionId, questionId), eq(questionResponses.userId, userId)));
    return !!r;
  }

  async getQuestionNonResponders(questionId: string, workspaceId: string): Promise<User[]> {
    const responders = await db
      .select({ userId: questionResponses.userId })
      .from(questionResponses)
      .where(eq(questionResponses.questionId, questionId));
    const responderIds = responders.map((r) => r.userId);

    const members = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    return members
      .filter((m) => !responderIds.includes(m.workspace_members.userId))
      .map((m) => m.users);
  }
}

export const storage = new DatabaseStorage();
