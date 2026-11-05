import prisma from "../db.js";

export const MAX_SCORE = 99;

export function forUsersAndGames(userIds: number[], gameIds: number[]) {
  return prisma.prediction.findMany({
    where: { userId: { in: userIds }, gameId: { in: gameIds } },
    select: { userId: true, gameId: true, homeScore: true, awayScore: true, updatedAt: true },
  });
}

export function upsert(userId: number, gameId: number, homeScore: number, awayScore: number) {
  return prisma.prediction.upsert({
    where: { userId_gameId: { userId, gameId } },
    create: { userId, gameId, homeScore, awayScore },
    update: { homeScore, awayScore },
    select: { userId: true, gameId: true, homeScore: true, awayScore: true, updatedAt: true },
  });
}

export function remove(userId: number, gameId: number) {
  return prisma.prediction.deleteMany({ where: { userId, gameId } });
}

/** Every pick these users made on a scored game this season, with its result. */
export function scoredForSeason(userIds: number[], season: number) {
  return prisma.prediction.findMany({
    where: { userId: { in: userIds }, game: { season, status: { in: ["FINAL", "LIVE"] } } },
    select: {
      userId: true,
      homeScore: true,
      awayScore: true,
      game: {
        select: { seasonType: true, week: true, status: true, homeScore: true, awayScore: true },
      },
    },
  });
}
