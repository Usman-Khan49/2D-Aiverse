import { Router, type NextFunction, type Request, type Response } from "express";
import { zoneRoute } from "./zoneRoute.js";
import { getAuth } from "@clerk/express";
import { db } from "../../db/client.js";
export const workspaceRoute = Router();

const requiredSignedIn = (req: Request, res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};

const toSlug = (value: string) => {
    const slug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

    return slug || "workspace";
};

const getMembership = (workspaceId: string, userId: string) => {
    return db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
    });
};



const resolveWorkspaceFromInput = async (input: {
    workspaceId?: string;
    workspaceSlug?: string;
    workspaceIdOrSlug?: string;
}) => {
    const workspaceId = input.workspaceId?.trim();
    const workspaceSlug = input.workspaceSlug?.trim();
    const workspaceIdOrSlug = input.workspaceIdOrSlug?.trim();

    if (workspaceId) {
        return db.workspace.findUnique({ where: { id: workspaceId } });
    }

    if (workspaceSlug) {
        return db.workspace.findUnique({ where: { slug: workspaceSlug } });
    }

    if (workspaceIdOrSlug) {
        return db.workspace.findFirst({
            where: {
                OR: [{ id: workspaceIdOrSlug }, { slug: workspaceIdOrSlug }],
            },
        });
    }

    return null;
};

const ensureUserExists = (userId: string) => {
    return db.user.findUnique({
        where: { id: userId },
        select: { id: true },
    });
};

const upsertSelfMembership = async (workspaceId: string, workspaceOwnerId: string, userId: string) => {
    const role = workspaceOwnerId === userId ? "owner" : "member";

    return db.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId, userId } },
        update: {},
        create: {
            workspaceId,
            userId,
            role,
        },
    });
};

workspaceRoute.use(requiredSignedIn);

// Get all workspaces for the authenticated user
workspaceRoute.get("/", async (req, res) => {

    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const memberships = await db.workspaceMember.findMany({
        where: { userId },
        include: { workspace: true },
        orderBy: { joinedAt: "desc" },
    });

    res.json({
        workspaces: memberships.map((membership) => ({
            ...membership.workspace,
            role: membership.role,
        })),
    });
});
// Create a new workspace
workspaceRoute.post("/", async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const userExists = await ensureUserExists(userId);
    if (!userExists) {
        return res.status(404).json({ error: "User not found" });
    }

    const name = String(req.body?.name || "").trim();
    if (!name) {
        return res.status(400).json({ error: "Workspace name is required" });
    }

    const slug = String(req.body?.slug || "").trim() || toSlug(name);

    try {
        const workspace = await db.workspace.create({
            data: {
                name,
                slug,
                ownerId: userId,
                members: {
                    create: {
                        userId,
                        role: "owner",
                    },
                },
            },
        });

        return res.status(201).json({ workspace });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Unique constraint")) {
            return res.status(409).json({ error: "Slug already exists. Please choose a different name." });
        }
        return res.status(400).json({ error: message });
    }
});

// Test mode: let any authenticated user join by workspace ID or slug without approval.
workspaceRoute.post("/join", async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const workspace = await resolveWorkspaceFromInput({
        workspaceId: req.body?.workspaceId,
        workspaceSlug: req.body?.workspaceSlug,
        workspaceIdOrSlug: req.body?.workspaceIdOrSlug,
    });

    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    const userExists = await ensureUserExists(userId);
    if (!userExists) {
        return res.status(404).json({ error: "User not found" });
    }

    const membership = await upsertSelfMembership(workspace.id, workspace.ownerId, userId);

    return res.status(200).json({
        message: "Joined workspace",
        workspace,
        role: membership.role,
    });
});



workspaceRoute.get("/:workspaceId", async (req, res) => {
    const { workspaceId } = req.params;
    const { userId } = getAuth(req);

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
    }

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
    });

    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    const membership = await getMembership(workspaceId, userId);
    res.json({
        workspace,
        role: membership?.role ?? (workspace.ownerId === userId ? "owner" : null),
    });
});

workspaceRoute.patch("/:workspaceId", async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { workspaceId } = req.params;

    if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
    }
    const name = req.body?.name ? String(req.body.name).trim() : undefined;
    const slug = req.body?.slug ? String(req.body.slug).trim() : undefined;

    if (!name && !slug) {
        return res.status(400).json({ error: "At least one of name or slug is required" });
    }

    try {
        const member = await db.workspaceMember.findUnique({
            where: { workspaceId_userId: { userId, workspaceId } },
        });
        if (!member || (member.role !== "owner" && member.role !== "admin")) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const workspace = await db.workspace.update({
            where: { id: workspaceId },
            data: {
                ...(name ? { name } : {}),
                ...(slug ? { slug: toSlug(slug) } : name ? { slug: toSlug(name) } : {}),
            },
        });

        res.status(200).json({ workspace });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Unique constraint")) {
            return res.status(409).json({ error: "Slug already exists. Please choose a different slug." });
        }
        return res.status(400).json({ error: "Failed to update workspace" });
    }
});

workspaceRoute.delete("/:workspaceId", async (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
    }

    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
    });

    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    if (workspace.ownerId !== userId) {
        return res.status(403).json({ error: "Only the owner can delete this workspace" });
    }

    await db.workspace.delete({
        where: { id: workspaceId },
    });

    res.status(200).json({ message: "Workspace deleted" });
});

workspaceRoute.get("/:workspaceId/members", async (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
    }

    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const membership = await getMembership(workspaceId, userId);
    if (!membership) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const members = await db.workspaceMember.findMany({
        where: { workspaceId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatarUrl: true,
                },
            },
        },
        orderBy: { joinedAt: "asc" },
    });

    res.status(200).json({ members });
});

workspaceRoute.delete("/:workspaceId/members/:memberId", async (req, res) => {
    const { workspaceId, memberId } = req.params;

    if (!workspaceId || !memberId) {
        return res.status(400).json({ error: "workspaceId and memberId are required" });
    }

    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const actorMembership = await getMembership(workspaceId, userId);
    if (!actorMembership || (actorMembership.role !== "owner" && actorMembership.role !== "admin")) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
    });

    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    if (workspace.ownerId === memberId) {
        return res.status(400).json({ error: "Cannot remove the workspace owner" });
    }

    const removed = await db.workspaceMember.deleteMany({
        where: { workspaceId, userId: memberId },
    });

    if (removed.count === 0) {
        return res.status(404).json({ error: "Member not found" });
    }

    res.status(200).json({ message: "Member removed from workspace" });
});

// Get all summaries for a workspace
workspaceRoute.get("/:workspaceId/summaries", async (req, res) => {
    const { workspaceId } = req.params;
    const { userId } = getAuth(req);

    if (!userId || !workspaceId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const summaries = await db.summary.findMany({
            where: {
                session: {
                    workspaceId: workspaceId
                }
            },
            include: {
                session: {
                    select: {
                        startedAt: true,
                        areaTag: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({ summaries });
    } catch (error) {
        console.error("[WorkspaceRoute] Error fetching summaries:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

workspaceRoute.use('/:workspaceId', zoneRoute);


