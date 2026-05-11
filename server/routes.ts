import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyUser } from "./middleware/auth";
// import { setupAuth, registerAuthRoutes, verifyUser } from "./replit_integrations/auth";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { formatDateKey, normalizeStoredDateKey } from "./date";

const UPLOADS_DIR = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-zip-compressed",
  "text/plain", "text/csv",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {


  app.get("/api/workspaces", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const workspaces = await storage.getWorkspacesForUser(userId);
      res.json(workspaces);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      res.status(500).json({ message: "Failed to fetch workspaces" });
    }
  });

  app.post("/api/workspaces", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, iconColor } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const workspace = await storage.createWorkspace({
        name: name.trim(),
        slug,
        iconColor: iconColor || "#3b82f6",
        ownerId: userId,
      });
      await storage.addWorkspaceMember(workspace.id, userId, "owner");

      const defaultLabels = [
        { name: "Bug", color: "#ef4444", workspaceId: workspace.id },
        { name: "Feature", color: "#3b82f6", workspaceId: workspace.id },
        { name: "Enhancement", color: "#8b5cf6", workspaceId: workspace.id },
        { name: "Documentation", color: "#06b6d4", workspaceId: workspace.id },
      ];
      for (const label of defaultLabels) {
        await storage.createLabel(label);
      }

      res.json(workspace);
    } catch (error) {
      console.error("Error creating workspace:", error);
      res.status(500).json({ message: "Failed to create workspace" });
    }
  });

  const requireWorkspaceMember = async (req: any, res: any, next: any) => {
    const userId = req.user.id;
    const workspaceId = req.params.workspaceId;
    if (!workspaceId) return next();
    const isMember = await storage.isWorkspaceMember(workspaceId, userId);
    if (!isMember) return res.status(403).json({ message: "Forbidden" });
    next();
  };

  const requireBoardMember = async (req: any, res: any, next: any) => {
    const userId = req.user.id;
    const boardId = req.params.boardId;
    if (!boardId) return next();
    const wsId = await storage.getWorkspaceIdForBoard(boardId);
    if (!wsId) return res.status(404).json({ message: "Board not found" });
    const role = await storage.getWorkspaceMemberRole(wsId, userId);
    if (!role) return res.status(403).json({ message: "Forbidden" });
    req.workspaceId = wsId;
    req.userRole = role;
    next();
  };

  const requireTaskMember = async (req: any, res: any, next: any) => {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    if (!taskId) return next();
    const wsId = await storage.getWorkspaceIdForTask(taskId);
    if (!wsId) return res.status(404).json({ message: "Task not found" });
    const role = await storage.getWorkspaceMemberRole(wsId, userId);
    if (!role) return res.status(403).json({ message: "Forbidden" });
    req.workspaceId = wsId;
    req.userRole = role;
    next();
  };

  const requireColumnMember = async (req: any, res: any, next: any) => {
    const userId = req.user.id;
    const columnId = req.params.columnId;
    if (!columnId) return next();
    const wsId = await storage.getWorkspaceIdForColumn(columnId);
    if (!wsId) return res.status(404).json({ message: "Column not found" });
    const isMember = await storage.isWorkspaceMember(wsId, userId);
    if (!isMember) return res.status(403).json({ message: "Forbidden" });
    next();
  };

  const requireLabelMember = async (req: any, res: any, next: any) => {
    const userId = req.user.id;
    const labelId = req.params.labelId;
    if (!labelId) return next();
    const wsId = await storage.getWorkspaceIdForLabel(labelId);
    if (!wsId) return res.status(404).json({ message: "Label not found" });
    const isMember = await storage.isWorkspaceMember(wsId, userId);
    if (!isMember) return res.status(403).json({ message: "Forbidden" });
    next();
  };

  const requireWorkspaceAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user.id;
    const workspaceId = req.params.workspaceId;
    if (!workspaceId) return next();
    const role = await storage.getWorkspaceMemberRole(workspaceId, userId);
    if (!role || !["owner", "admin"].includes(role)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  app.get("/api/workspaces/:workspaceId/members", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const members = await storage.getWorkspaceMembers(req.params.workspaceId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.patch("/api/workspaces/:workspaceId/members/:userId/role", verifyUser, requireWorkspaceAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!["admin", "member"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      await storage.updateWorkspaceMemberRole(req.params.workspaceId, req.params.userId, role);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/workspaces/:workspaceId/members/:userId", verifyUser, requireWorkspaceAdmin, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      if (req.params.userId === currentUserId) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }
      const targetRole = await storage.getWorkspaceMemberRole(req.params.workspaceId, req.params.userId);
      if (targetRole === "owner") {
        return res.status(400).json({ message: "Cannot remove workspace owner" });
      }
      await storage.removeWorkspaceMember(req.params.workspaceId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  app.get("/api/workspaces/:workspaceId/my-role", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // DEBUG
      console.log("REQ.USER:", req.user);
      console.log("USER ID:", userId);
      console.log("WORKSPACE ID:", req.params.workspaceId);

      const role = await storage.getWorkspaceMemberRole(req.params.workspaceId, userId);

      console.log("ROLE FROM DB:", role);

      res.json({ role: role || "member" });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch role" });
    }
  });

  app.get("/api/workspaces/:workspaceId/stats", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const role = await storage.getWorkspaceMemberRole(req.params.workspaceId, req.user.id);
      const stats = role && ["owner", "admin"].includes(role)
        ? await storage.getWorkspaceStats(req.params.workspaceId)
        : await storage.getUserPerformance(req.params.workspaceId, req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/workspaces/:workspaceId/detailed-stats", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const role = await storage.getWorkspaceMemberRole(req.params.workspaceId, req.user.id);
      const stats = role && ["owner", "admin"].includes(role)
        ? await storage.getWorkspaceDetailedStats(req.params.workspaceId)
        : await storage.getUserPerformance(req.params.workspaceId, req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching detailed stats:", error);
      res.status(500).json({ message: "Failed to fetch detailed stats" });
    }
  });

  app.get("/api/workspaces/:workspaceId/performance", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const role = await storage.getWorkspaceMemberRole(req.params.workspaceId, req.user.id);
      const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
      const targetUserId = role && ["owner", "admin"].includes(role)
        ? requestedUserId || req.user.id
        : req.user.id;
      const performance = await storage.getUserPerformance(req.params.workspaceId, targetUserId);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching performance:", error);
      res.status(500).json({ message: "Failed to fetch performance" });
    }
  });

  app.get("/api/workspaces/:workspaceId/boards", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const boards = await storage.getBoardsForWorkspace(req.params.workspaceId);
      res.json(boards);
    } catch (error) {
      console.error("Error fetching boards:", error);
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.post("/api/workspaces/:workspaceId/boards", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, description, coverColor } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const board = await storage.createBoard({
        workspaceId: req.params.workspaceId,
        name: name.trim(),
        description: description || null,
        coverColor: coverColor || "#3b82f6",
        createdBy: userId,
      });

      const defaultColumns = [
        { name: "To Do", color: "#6b7280", boardId: board.id, position: 0 },
        { name: "In Progress", color: "#f59e0b", boardId: board.id, position: 1 },
        { name: "Done", color: "#22c55e", boardId: board.id, position: 2 },
      ];
      for (const col of defaultColumns) {
        await storage.createColumn(col);
      }

      await storage.createActivityLog({
        workspaceId: req.params.workspaceId,
        userId,
        action: "created",
        entityType: "board",
        entityId: board.id,
        metadata: { boardName: board.name },
      });

      res.json(board);
    } catch (error) {
      console.error("Error creating board:", error);
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  app.get("/api/boards/:boardId", verifyUser, requireBoardMember, async (req: any, res) => {
    try {
      const board = await storage.getBoard(req.params.boardId);
      if (!board) return res.status(404).json({ message: "Board not found" });
      res.json(board);
    } catch (error) {
      console.error("Error fetching board:", error);
      res.status(500).json({ message: "Failed to fetch board" });
    }
  });

  app.patch("/api/boards/:boardId", verifyUser, requireBoardMember, async (req: any, res) => {
    try {
      if (!["owner", "admin"].includes(req.userRole)) {
        return res.status(403).json({ message: "Only workspace admins can update boards" });
      }

      const { name, description, coverColor } = req.body;
      const updateData: any = {};

      if (name !== undefined) {
        if (!String(name).trim()) {
          return res.status(400).json({ message: "Board name is required" });
        }
        updateData.name = String(name).trim();
      }
      if (description !== undefined) {
        updateData.description = description ? String(description).trim() : null;
      }
      if (coverColor !== undefined) {
        updateData.coverColor = coverColor;
      }

      const board = await storage.updateBoard(req.params.boardId, updateData);
      res.json(board);
    } catch (error) {
      console.error("Error updating board:", error);
      res.status(500).json({ message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:boardId", verifyUser, requireBoardMember, async (req: any, res) => {
    try {
      await storage.deleteBoard(req.params.boardId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting board:", error);
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  app.get("/api/boards/:boardId/columns", verifyUser, requireBoardMember, async (req: any, res) => {
    try {
      const cols = await storage.getColumnsForBoard(req.params.boardId);
      res.json(cols);
    } catch (error) {
      console.error("Error fetching columns:", error);
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.post("/api/boards/:boardId/columns", verifyUser, requireBoardMember, async (req: any, res) => {
    try {
      const { name, color } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const col = await storage.createColumn({
        boardId: req.params.boardId,
        name: name.trim(),
        color: color || "#6b7280",
        position: 0,
      });
      res.json(col);
    } catch (error) {
      console.error("Error creating column:", error);
      res.status(500).json({ message: "Failed to create column" });
    }
  });

  app.delete("/api/columns/:columnId", verifyUser, requireColumnMember, async (req: any, res) => {
    try {
      await storage.deleteColumn(req.params.columnId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting column:", error);
      res.status(500).json({ message: "Failed to delete column" });
    }
  });

  app.get("/api/boards/:boardId/tasks", verifyUser, requireBoardMember, async (req: any, res) => {
    try {
      const tasksList = ["owner", "admin"].includes(req.userRole)
        ? await storage.getTasksForBoard(req.params.boardId)
        : await storage.getTasksForBoardForUser(req.params.boardId, req.user.id);
      res.json(tasksList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/boards/:boardId/tasks", verifyUser, requireBoardMember, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { title, columnId, priority, description, dueDate } = req.body;
      if (!title?.trim() || !columnId) {
        return res.status(400).json({ message: "Title and columnId are required" });
      }
      const task = await storage.createTask({
        boardId: req.params.boardId,
        columnId,
        title: title.trim(),
        description: description || null,
        priority: priority || "medium",
        position: 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: userId,
      });

      const wsId = req.workspaceId || await storage.getWorkspaceIdForBoard(req.params.boardId);
      if (wsId) {
        await storage.createActivityLog({
          workspaceId: wsId,
          taskId: task.id,
          userId,
          action: "created",
          entityType: "task",
          entityId: task.id,
          metadata: { taskTitle: task.title },
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:taskId", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.userRole;

      if (!["owner", "admin"].includes(userRole)) {
        const task = await storage.getTask(req.params.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });
        const isCreator = task.createdBy === userId;
        const isAssignee = await storage.isTaskAssignee(req.params.taskId, userId);
        if (!isCreator && !isAssignee) {
          return res.status(403).json({ message: "You can only edit tasks you created or are assigned to" });
        }
      }

      const { title, description, priority, dueDate, startDate, coverImageId } = req.body;
      const updateData: any = {};
      const changes: string[] = [];

      if (title !== undefined) {
        const trimmedTitle = String(title).trim();
        if (!trimmedTitle) {
          return res.status(400).json({ message: "Task title is required" });
        }
        updateData.title = trimmedTitle;
        changes.push("title");
      }
      if (description !== undefined) { updateData.description = description; changes.push("description"); }
      if (priority !== undefined) { updateData.priority = priority; changes.push("priority"); }
      if (dueDate !== undefined) { updateData.dueDate = dueDate ? new Date(dueDate) : null; changes.push("due date"); }
      if (startDate !== undefined) { updateData.startDate = startDate ? new Date(startDate) : null; changes.push("start date"); }
      if (coverImageId !== undefined) { updateData.coverImageId = coverImageId || null; changes.push("cover image"); }

      const task = await storage.updateTask(req.params.taskId, updateData);

      if (req.workspaceId && changes.length > 0) {
        await storage.createActivityLog({
          workspaceId: req.workspaceId,
          taskId: task.id,
          userId,
          action: "updated",
          entityType: "task",
          entityId: task.id,
          metadata: { fields: changes, taskTitle: task.title },
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.get("/api/tasks/:taskId", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const task = await storage.getTaskWithRelations(req.params.taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.patch("/api/tasks/:taskId/move", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.userRole;

      if (!["owner", "admin"].includes(userRole)) {
        const task = await storage.getTask(req.params.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });
        const isCreator = task.createdBy === userId;
        const isAssignee = await storage.isTaskAssignee(req.params.taskId, userId);
        if (!isCreator && !isAssignee) {
          return res.status(403).json({ message: "You can only move tasks you created or are assigned to" });
        }
      }

      const { columnId, position } = req.body;
      await storage.moveTask(req.params.taskId, columnId, position);

      if (req.workspaceId) {
        await storage.createActivityLog({
          workspaceId: req.workspaceId,
          taskId: req.params.taskId,
          userId,
          action: "moved",
          entityType: "task",
          entityId: req.params.taskId,
          metadata: { columnId },
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error moving task:", error);
      res.status(500).json({ message: "Failed to move task" });
    }
  });

  app.delete("/api/tasks/:taskId", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const userRole = req.userRole;
      if (!["owner", "admin"].includes(userRole)) {
        return res.status(403).json({ message: "Only workspace owners can delete tasks" });
      }
      await storage.deleteTask(req.params.taskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.get("/api/tasks/:taskId/comments", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const commentsList = await storage.getCommentsForTask(req.params.taskId);
      res.json(commentsList);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/tasks/:taskId/comments", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { content, parentId } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }
      const comment = await storage.createComment({
        taskId: req.params.taskId,
        userId,
        content: content.trim(),
        parentId: parentId || null,
      });

      if (req.workspaceId) {
        await storage.createActivityLog({
          workspaceId: req.workspaceId,
          taskId: req.params.taskId,
          userId,
          action: "commented",
          entityType: "comment",
          entityId: comment.id,
          metadata: { content: content.trim().substring(0, 100) },
        });

        const task = await storage.getTask(req.params.taskId);
        if (task?.createdBy && task.createdBy !== userId) {
          await storage.createNotification({
            userId: task.createdBy,
            workspaceId: req.workspaceId,
            actorId: userId,
            type: "comment",
            title: "New comment on your task",
            message: `Someone commented on "${task.title}"`,
            entityType: "task",
            entityId: task.id,
            read: false,
          });
        }

        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        const mentionedIds: string[] = [];
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionedUserId = match[2];
          if (mentionedUserId !== userId && mentionedUserId !== task?.createdBy && !mentionedIds.includes(mentionedUserId)) {
            mentionedIds.push(mentionedUserId);
          }
        }
        for (const mentionedId of mentionedIds) {
          await storage.createNotification({
            userId: mentionedId,
            workspaceId: req.workspaceId,
            actorId: userId,
            type: "mention",
            title: "You were mentioned in a comment",
            message: `Someone mentioned you in a comment on "${task?.title || "a task"}"`,
            entityType: "task",
            entityId: req.params.taskId,
            read: false,
          });
        }
      }

      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get("/api/workspaces/:workspaceId/labels", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const labelsList = await storage.getLabelsForWorkspace(req.params.workspaceId);
      res.json(labelsList);
    } catch (error) {
      console.error("Error fetching labels:", error);
      res.status(500).json({ message: "Failed to fetch labels" });
    }
  });

  app.post("/api/workspaces/:workspaceId/labels", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const { name, color } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const label = await storage.createLabel({
        workspaceId: req.params.workspaceId,
        name: name.trim(),
        color: color || "#3b82f6",
      });
      res.json(label);
    } catch (error) {
      console.error("Error creating label:", error);
      res.status(500).json({ message: "Failed to create label" });
    }
  });

  app.delete("/api/labels/:labelId", verifyUser, requireLabelMember, async (req: any, res) => {
    try {
      await storage.deleteLabel(req.params.labelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting label:", error);
      res.status(500).json({ message: "Failed to delete label" });
    }
  });

  app.post("/api/tasks/:taskId/assignees", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { userId: assigneeId } = req.body;
      if (!assigneeId) return res.status(400).json({ message: "userId is required" });
      const assignee = await storage.addTaskAssignee(req.params.taskId, assigneeId);

      if (req.workspaceId) {
        await storage.createActivityLog({
          workspaceId: req.workspaceId,
          taskId: req.params.taskId,
          userId,
          action: "assigned",
          entityType: "task",
          entityId: req.params.taskId,
          metadata: { assigneeId },
        });

        if (assigneeId !== userId) {
          const task = await storage.getTask(req.params.taskId);
          await storage.createNotification({
            userId: assigneeId,
            workspaceId: req.workspaceId,
            type: "assigned",
            title: "You've been assigned to a task",
            message: `You were assigned to "${task?.title || "a task"}"`,
            entityType: "task",
            entityId: req.params.taskId,
            read: false,
          });
        }
      }

      res.json(assignee);
    } catch (error) {
      console.error("Error adding assignee:", error);
      res.status(500).json({ message: "Failed to add assignee" });
    }
  });

  app.delete("/api/tasks/:taskId/assignees/:userId", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      await storage.removeTaskAssignee(req.params.taskId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing assignee:", error);
      res.status(500).json({ message: "Failed to remove assignee" });
    }
  });

  app.post("/api/tasks/:taskId/labels", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const { labelId } = req.body;
      if (!labelId) return res.status(400).json({ message: "labelId is required" });
      const taskLabel = await storage.addTaskLabel(req.params.taskId, labelId);
      res.json(taskLabel);
    } catch (error) {
      console.error("Error adding label:", error);
      res.status(500).json({ message: "Failed to add label" });
    }
  });

  app.delete("/api/tasks/:taskId/labels/:labelId", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      await storage.removeTaskLabel(req.params.taskId, req.params.labelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing label:", error);
      res.status(500).json({ message: "Failed to remove label" });
    }
  });

  app.get("/api/tasks/:taskId/checklist", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const items = await storage.getChecklistItems(req.params.taskId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching checklist:", error);
      res.status(500).json({ message: "Failed to fetch checklist" });
    }
  });

  app.post("/api/tasks/:taskId/checklist", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const { title } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      const item = await storage.createChecklistItem({
        taskId: req.params.taskId,
        title: title.trim(),
        completed: false,
        position: 0,
      });
      res.json(item);
    } catch (error) {
      console.error("Error creating checklist item:", error);
      res.status(500).json({ message: "Failed to create checklist item" });
    }
  });

  app.patch("/api/checklist/:itemId", verifyUser, async (req: any, res) => {
    try {
      const { completed, title } = req.body;
      const updateData: any = {};
      if (completed !== undefined) updateData.completed = completed;
      if (title !== undefined) updateData.title = title;
      const item = await storage.updateChecklistItem(req.params.itemId, updateData);
      res.json(item);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  app.delete("/api/checklist/:itemId", verifyUser, async (req: any, res) => {
    try {
      await storage.deleteChecklistItem(req.params.itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  app.get("/api/tasks/:taskId/activity", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const logs = await storage.getActivityLogsForTask(req.params.taskId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get("/api/workspaces/:workspaceId/activity", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const logs = await storage.getActivityLogsForWorkspace(req.params.workspaceId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get("/api/notifications", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const workspaceId = req.query.workspaceId as string | undefined;
      const notifs = await storage.getNotificationsForUser(userId, workspaceId);
      res.json(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const workspaceId = req.query.workspaceId as string | undefined;
      const count = await storage.getUnreadNotificationCount(userId, workspaceId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch count" });
    }
  });

  app.patch("/api/notifications/:notificationId/read", verifyUser, async (req: any, res) => {
    try {
      await storage.markNotificationRead(req.params.notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { workspaceId } = req.body;
      if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
      await storage.markAllNotificationsRead(userId, workspaceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  app.post(
    "/api/workspaces/:workspaceId/invites",
    verifyUser,
    requireWorkspaceAdmin,
    async (req: any, res) => {
      try {
        const { email, role } = req.body;
        const workspaceId = req.params.workspaceId;

        if (!email?.trim()) {
          return res.status(400).json({ message: "Email is required" });
        }

        const cleanEmail = email.trim().toLowerCase();

        // cek apakah user sudah punya akun
        const { data: usersData, error: listError } =
          await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          console.error(listError);
          return res.status(500).json({ message: listError.message });
        }

        const existingUser = usersData.users.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );
        if (existingUser) {
          await storage.addWorkspaceMember(
            workspaceId,
            existingUser.id,
            role || "member"
          );

          return res.json({ autoJoined: true });
        }

        // kalau belum punya akun → kirim invite email via Supabase
        const { error } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
            redirectTo: `${process.env.FRONTEND_URL}/invite?workspaceId=${workspaceId}`,
          });

        if (error) {
          console.error(error);
          return res.status(500).json({ message: error.message });
        }

        res.json({ invited: true });
      } catch (error) {
        console.error("Invite error:", error);
        res.status(500).json({ message: "Failed to invite" });
      }
    }
  );

  app.get("/api/workspaces/:workspaceId/invites", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const invites = await storage.getInvitesForWorkspace(req.params.workspaceId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.delete("/api/invites/:inviteId", verifyUser, async (req: any, res) => {
    try {
      await storage.deleteInvite(req.params.inviteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  app.post("/api/invites/:token/accept", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.status !== "pending") return res.status(400).json({ message: "Invite already used" });
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invite expired" });
      }

      const alreadyMember = await storage.isWorkspaceMember(invite.workspaceId, userId);
      if (alreadyMember) {
        await storage.updateInviteStatus(invite.id, "accepted");
        return res.json({ workspaceId: invite.workspaceId, alreadyMember: true });
      }

      await storage.addWorkspaceMember(invite.workspaceId, userId, invite.role);
      await storage.updateInviteStatus(invite.id, "accepted");
      res.json({ workspaceId: invite.workspaceId });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  app.get("/api/workspaces/:workspaceId/search", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query?.trim()) return res.json([]);
      const results = await storage.searchTasks(req.params.workspaceId, query.trim());
      res.json(results);
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to search" });
    }
  });

  app.patch("/api/workspaces/:workspaceId", verifyUser, requireWorkspaceAdmin, async (req: any, res) => {
    try {
      const { name, description, iconColor } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (iconColor !== undefined) updateData.iconColor = iconColor;
      const ws = await storage.updateWorkspace(req.params.workspaceId, updateData);
      res.json(ws);
    } catch (error) {
      console.error("Error updating workspace:", error);
      res.status(500).json({ message: "Failed to update workspace" });
    }
  });

  app.get("/api/workspaces/:workspaceId/members/search", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const query = req.query.q as string || "";
      const members = await storage.searchWorkspaceMembers(req.params.workspaceId, query);
      res.json(members);
    } catch (error) {
      console.error("Error searching members:", error);
      res.status(500).json({ message: "Failed to search members" });
    }
  });

  app.post("/api/tasks/:taskId/attachments", verifyUser, requireTaskMember, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const attachment = await storage.createAttachment({
        workspaceId: req.workspaceId,
        taskId: req.params.taskId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedBy: userId,
      });

      if (req.workspaceId) {
        await storage.createActivityLog({
          workspaceId: req.workspaceId,
          taskId: req.params.taskId,
          userId,
          action: "attached",
          entityType: "attachment",
          entityId: attachment.id,
          metadata: { fileName: file.originalname },
        });
      }

      res.json(attachment);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/tasks/:taskId/attachments", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const atts = await storage.getAttachmentsForTask(req.params.taskId);
      res.json(atts);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.get("/api/attachments/:attachmentId/download", verifyUser, async (req: any, res) => {
    try {
      const att = await storage.getAttachment(req.params.attachmentId);
      if (!att) return res.status(404).json({ message: "Attachment not found" });

      const wsId = att.workspaceId;
      const userId = req.user.id;
      const isMember = await storage.isWorkspaceMember(wsId, userId);
      if (!isMember) return res.status(403).json({ message: "Forbidden" });

      if (!fs.existsSync(att.path)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.download(att.path, att.originalName);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete("/api/attachments/:attachmentId", verifyUser, async (req: any, res) => {
    try {
      const att = await storage.getAttachment(req.params.attachmentId);
      if (!att) return res.status(404).json({ message: "Attachment not found" });

      const userId = req.user.id;
      const isMember = await storage.isWorkspaceMember(att.workspaceId, userId);
      if (!isMember) return res.status(403).json({ message: "Forbidden" });

      if (att.uploadedBy !== userId) {
        const role = await storage.getWorkspaceMemberRole(att.workspaceId, userId);
        if (!role || !["owner", "admin"].includes(role)) {
          return res.status(403).json({ message: "Only the uploader or admin can delete" });
        }
      }

      if (fs.existsSync(att.path)) {
        fs.unlinkSync(att.path);
      }
      await storage.deleteAttachment(att.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  app.patch("/api/tasks/:taskId/cover", verifyUser, requireTaskMember, async (req: any, res) => {
    try {
      const { coverImageId } = req.body;
      const task = await storage.updateTask(req.params.taskId, { coverImageId: coverImageId || null });
      res.json(task);
    } catch (error) {
      console.error("Error updating cover:", error);
      res.status(500).json({ message: "Failed to update cover image" });
    }
  });

  app.get("/api/workspaces/:workspaceId/chat-rooms", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const rooms = await storage.getChatRooms(req.params.workspaceId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  app.post("/api/workspaces/:workspaceId/chat-rooms", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, description, boardId } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

      const room = await storage.createChatRoom({
        workspaceId: req.params.workspaceId,
        name: name.trim(),
        description: description || null,
        boardId: boardId || null,
        createdBy: userId,
      });
      res.json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  app.get("/api/chat-rooms/:roomId/messages", verifyUser, async (req: any, res) => {
    try {
      const room = await storage.getChatRoom(req.params.roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const userId = req.user.id;
      const isMember = await storage.isWorkspaceMember(room.workspaceId, userId);
      if (!isMember) return res.status(403).json({ message: "Forbidden" });

      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string | undefined;
      const messages = await storage.getChatMessages(req.params.roomId, limit, before);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat-rooms/:roomId/messages", verifyUser, async (req: any, res) => {
    try {
      const room = await storage.getChatRoom(req.params.roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const userId = req.user.id;
      const isMember = await storage.isWorkspaceMember(room.workspaceId, userId);
      if (!isMember) return res.status(403).json({ message: "Forbidden" });

      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content is required" });

      const message = await storage.createChatMessage({
        roomId: req.params.roomId,
        workspaceId: room.workspaceId,
        userId,
        content: content.trim(),
      });

      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        const mentionedUserId = match[2];
        if (mentionedUserId !== userId) {
          await storage.createNotification({
            userId: mentionedUserId,
            workspaceId: room.workspaceId,
            actorId: userId,
            type: "mention",
            title: "You were mentioned in chat",
            message: `Someone mentioned you in #${room.name}`,
            entityType: "chat_room",
            entityId: room.id,
            read: false,
          });
        }
      }

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/chat-messages/:messageId/reactions", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ message: "Emoji is required" });

      const reaction = await storage.addChatReaction({
        messageId: req.params.messageId,
        userId,
        emoji,
      });
      res.json(reaction);
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  app.delete("/api/chat-messages/:messageId/reactions/:emoji", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.removeChatReaction(req.params.messageId, userId, decodeURIComponent(req.params.emoji));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  app.get("/api/workspaces/:workspaceId/questions", verifyUser, requireWorkspaceMember, async (req: any, res) => {
    try {
      const qs = await storage.getQuestions(req.params.workspaceId);
      res.json(qs);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post("/api/workspaces/:workspaceId/questions", verifyUser, requireWorkspaceAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { title, description, type, options, dueAt } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });

      const question = await storage.createQuestion({
        workspaceId: req.params.workspaceId,
        creatorId: userId,
        title: title.trim(),
        description: description || null,
        type: type || "short_answer",
        options: options || null,
        dueAt: dueAt ? new Date(dueAt) : null,
        status: "active",
        reminderEnabled: true,
      });

      const members = await storage.getWorkspaceMembers(req.params.workspaceId);
      for (const member of members) {
        if (member.userId !== userId) {
          await storage.createNotification({
            userId: member.userId,
            workspaceId: req.params.workspaceId,
            actorId: userId,
            type: "question",
            title: "New question posted",
            message: `A new question was posted: "${title.trim()}"`,
            entityType: "question",
            entityId: question.id,
            read: false,
          });
        }
      }

      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.get("/api/questions/:questionId", verifyUser, async (req: any, res) => {
    try {
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) return res.status(404).json({ message: "Question not found" });

      const userId = req.user.id;
      const isMember = await storage.isWorkspaceMember(question.workspaceId, userId);
      if (!isMember) return res.status(403).json({ message: "Forbidden" });

      const responses = await storage.getQuestionResponses(req.params.questionId);
      const hasResponded = await storage.hasUserRespondedToQuestion(req.params.questionId, userId);
      const members = await storage.getWorkspaceMembers(question.workspaceId);

      res.json({
        ...question,
        responses,
        hasResponded,
        totalMembers: members.length,
        responseRate: members.length > 0 ? Math.round((responses.length / members.length) * 100) : 0,
      });
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  app.post("/api/questions/:questionId/responses", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) return res.status(404).json({ message: "Question not found" });

      const isMember = await storage.isWorkspaceMember(question.workspaceId, userId);
      if (!isMember) return res.status(403).json({ message: "Forbidden" });

      const hasResponded = await storage.hasUserRespondedToQuestion(req.params.questionId, userId);
      if (hasResponded) return res.status(400).json({ message: "Already responded" });

      const { response } = req.body;
      if (!response?.toString().trim()) return res.status(400).json({ message: "Response is required" });

      const qResponse = await storage.createQuestionResponse({
        questionId: req.params.questionId,
        userId,
        response: response.toString().trim(),
      });

      res.json(qResponse);
    } catch (error) {
      console.error("Error submitting response:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  app.post("/api/questions/:questionId/remind", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) return res.status(404).json({ message: "Question not found" });

      const role = await storage.getWorkspaceMemberRole(question.workspaceId, userId);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const nonResponders = await storage.getQuestionNonResponders(req.params.questionId, question.workspaceId);
      for (const user of nonResponders) {
        await storage.createNotification({
          userId: user.id,
          workspaceId: question.workspaceId,
          actorId: userId,
          type: "reminder",
          title: "Reminder: Please respond to question",
          message: `You haven't responded to: "${question.title}"`,
          entityType: "question",
          entityId: question.id,
          read: false,
        });
      }

      res.json({ reminded: nonResponders.length });
    } catch (error) {
      console.error("Error sending reminders:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  app.patch("/api/questions/:questionId", verifyUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const question = await storage.getQuestion(req.params.questionId);
      if (!question) return res.status(404).json({ message: "Question not found" });

      const role = await storage.getWorkspaceMemberRole(question.workspaceId, userId);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { status } = req.body;
      const updated = await storage.updateQuestion(req.params.questionId, { status });
      res.json(updated);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });
  // ── ATTENDANCE ──────────────────────────────────────────────
  app.get(
    "/api/workspaces/:workspaceId/attendance",
    verifyUser,
    requireWorkspaceMember,
    async (req: any, res) => {
      try {
        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
        const data = await storage.getAttendanceForWorkspace(
          req.params.workspaceId, year, month
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ message: "Failed to fetch attendance" });
      }
    }
  );

  app.get(
    "/api/workspaces/:workspaceId/attendance/today",
    verifyUser,
    requireWorkspaceMember,
    async (req: any, res) => {
      try {
        const data = await storage.getTodayAttendance(
          req.params.workspaceId,
          req.user.id
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching today attendance:", error);
        res.status(500).json({ message: "Failed to fetch today attendance" });
      }
    }
  );

  app.post(
    "/api/workspaces/:workspaceId/attendance/check-in",
    verifyUser,
    requireWorkspaceMember,
    async (req: any, res) => {
      try {
        const { status, note, checkInPhoto } = req.body;
        const today = formatDateKey(new Date());
        const now = new Date().toISOString();
        const data = await storage.upsertAttendance({
          workspaceId: req.params.workspaceId,
          userId: req.user.id,
          date: today,
          status: status || "present",
          checkIn: now,
          note: note || null,
          checkInPhoto: checkInPhoto || null,
        });

        // Notif ke owner/admin (opsional)
        res.json(data);
      } catch (error) {
        console.error("Error checking in:", error);
        res.status(500).json({ message: "Failed to check in" });
      }
    }
  );

  app.post(
    "/api/workspaces/:workspaceId/attendance/check-out",
    verifyUser,
    requireWorkspaceMember,
    async (req: any, res) => {
      try {
        const today = formatDateKey(new Date());
        const existing = await storage.getTodayAttendance(
          req.params.workspaceId, req.user.id
        );
        if (!existing) {
          return res.status(400).json({ message: "Must check in first" });
        }
        const { checkOutPhoto } = req.body;
        const data = await storage.upsertAttendance({
          workspaceId: req.params.workspaceId,
          userId: req.user.id,
          date: today,
          status: existing.status,
          checkIn: existing.checkIn,
          checkOut: new Date().toISOString(),
          checkInPhoto: existing.checkInPhoto,
          checkOutPhoto: checkOutPhoto || null,
          note: existing.note,
        });
        res.json(data);
      } catch (error) {
        console.error("Error checking out:", error);
        res.status(500).json({ message: "Failed to check out" });
      }
    }
  );

  app.post(
    "/api/workspaces/:workspaceId/attendance/remind",
    verifyUser,
    requireWorkspaceAdmin,
    async (req: any, res) => {
      try {
        const today = formatDateKey(new Date());
        const allMembers = await storage.getWorkspaceMembers(req.params.workspaceId);
        const todayData = await storage.getAttendanceForWorkspace(
          req.params.workspaceId,
          new Date().getFullYear(),
          new Date().getMonth() + 1
        );
        const checkedInIds = todayData
          .filter((a) => normalizeStoredDateKey(a.date) === today)
          .map((a) => a.userId);

        const notYet = allMembers.filter(
          (m) => !checkedInIds.includes(m.userId) && m.userId !== req.user.id
        );

        for (const member of notYet) {
          await storage.createNotification({
            userId: member.userId,
            workspaceId: req.params.workspaceId,
            actorId: req.user.id,
            type: "reminder",
            title: "Reminder: Belum absen hari ini",
            message: "Jangan lupa check-in kehadiran kamu hari ini!",
            entityType: "attendance",
            entityId: req.params.workspaceId,
            read: false,
          });
        }

        res.json({ reminded: notYet.length });
      } catch (error) {
        console.error("Error sending reminder:", error);
        res.status(500).json({ message: "Failed to send reminder" });
      }
    }
  );
  return httpServer;
}
