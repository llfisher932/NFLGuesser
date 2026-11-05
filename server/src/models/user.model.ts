import prisma from "../db.js";

const orgSummary = { select: { organization: { select: { id: true, name: true } } } } as const;

export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

export function findForLogin(username: string) {
  return prisma.user.findUnique({
    where: { username: normalizeUsername(username) },
    select: { id: true, passwordHash: true, sessionVersion: true },
  });
}

/** Everything the session check needs, and nothing it doesn't. */
export function findSession(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, isAdmin: true, sessionVersion: true },
  });
}

export function findCredentials(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, passwordHash: true } });
}

/** The signed-in user's own record, with the orgs they can see. */
export async function findSelf(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      displayName: true,
      isAdmin: true,
      memberships: { ...orgSummary, orderBy: { organization: { name: "asc" } } },
    },
  });

  if (!user) return null;

  const { memberships, ...rest } = user;
  return { ...rest, organizations: memberships.map((m) => m.organization) };
}

export type Self = NonNullable<Awaited<ReturnType<typeof findSelf>>>;

/** Changing a password signs the user out of every other session. */
export function setPassword(id: number, passwordHash: string) {
  return prisma.user.update({
    where: { id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    select: { id: true, sessionVersion: true },
  });
}

// ---- Admin ----

export async function listAll() {
  const users = await prisma.user.findMany({
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      isAdmin: true,
      createdAt: true,
      memberships: orgSummary,
      _count: { select: { predictions: true } },
    },
  });

  return users.map(({ memberships, _count, ...user }) => ({
    ...user,
    organizations: memberships.map((m) => m.organization),
    predictionCount: _count.predictions,
  }));
}

export function usernameTaken(username: string, exceptId?: number) {
  return prisma.user
    .findFirst({ where: { username, ...(exceptId !== undefined && { id: { not: exceptId } }) }, select: { id: true } })
    .then(Boolean);
}

export function create(data: {
  username: string;
  displayName: string;
  passwordHash: string;
  isAdmin: boolean;
  organizationIds: number[];
}) {
  const { organizationIds, ...fields } = data;

  return prisma.user.create({
    data: {
      ...fields,
      memberships: { create: organizationIds.map((organizationId) => ({ organizationId })) },
    },
    select: { id: true },
  });
}

export function update(id: number, data: { username?: string; displayName?: string; isAdmin?: boolean }) {
  return prisma.user.update({ where: { id }, data, select: { id: true } });
}

/** Replaces the user's memberships with exactly these orgs. */
export function setOrganizations(id: number, organizationIds: number[]) {
  return prisma.$transaction([
    prisma.membership.deleteMany({ where: { userId: id, organizationId: { notIn: organizationIds } } }),
    prisma.membership.createMany({
      data: organizationIds.map((organizationId) => ({ userId: id, organizationId })),
      skipDuplicates: true,
    }),
  ]);
}

export function remove(id: number) {
  return prisma.user.delete({ where: { id } });
}

export function exists(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
}
