import prisma from "../db.js";
import { generateOrgCode } from "../passwords.js";

export function isMember(userId: number, organizationId: number) {
  return prisma.membership
    .findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { userId: true } })
    .then(Boolean);
}

/** What a member sees about an org: its name and who's in it. Never the code. */
export async function findForMembers(id: number) {
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      memberships: {
        orderBy: { user: { displayName: "asc" } },
        select: { user: { select: { id: true, username: true, displayName: true } } },
      },
    },
  });

  if (!org) return null;

  const { memberships, ...rest } = org;
  return { ...rest, members: memberships.map((m) => m.user) };
}

export function memberIds(id: number) {
  return prisma.membership
    .findMany({ where: { organizationId: id }, select: { userId: true } })
    .then((rows) => rows.map((r) => r.userId));
}

// ---- Admin ----

export async function listAll() {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, createdAt: true, _count: { select: { memberships: true } } },
  });

  return orgs.map(({ _count, ...org }) => ({ ...org, memberCount: _count.memberships }));
}

export function existingIds(ids: number[]) {
  return prisma.organization
    .findMany({ where: { id: { in: ids } }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id));
}

export function create(name: string) {
  return prisma.organization.create({ data: { name, code: generateOrgCode() }, select: { id: true } });
}

export function rename(id: number, name: string) {
  return prisma.organization.update({ where: { id }, data: { name }, select: { id: true } });
}

export function regenerateCode(id: number) {
  return prisma.organization.update({ where: { id }, data: { code: generateOrgCode() }, select: { id: true } });
}

/** Deleting an org only removes the group. Its members and their picks stay. */
export function remove(id: number) {
  return prisma.organization.delete({ where: { id } });
}

export function exists(id: number) {
  return prisma.organization.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
}

export function addMember(organizationId: number, userId: number) {
  return prisma.membership.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    create: { userId, organizationId },
    update: {},
  });
}

export function removeMember(organizationId: number, userId: number) {
  return prisma.membership.deleteMany({ where: { organizationId, userId } });
}
