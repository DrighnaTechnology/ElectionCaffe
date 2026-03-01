import { createLogger } from '@electioncaffe/shared';
import { coreDb, getTenantClientBySlug } from '@electioncaffe/database';

const logger = createLogger('cadre-service');

const SNAPSHOT_INTERVAL = 15 * 60 * 1000; // 15 minutes
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'ec-internal-dev-key';

/**
 * Snapshot Worker — tenant-aware
 * Runs every 15 minutes across ALL tenants to:
 * 1. Capture turnout snapshots for all active elections
 * 2. Detect anomalies (sudden spikes or stalls)
 * 3. Check for silent agents (no activity for 30+ min)
 * 4. Broadcast results via WebSocket
 *
 * Tenant isolation: Iterates all tenants from core DB, gets each tenant's
 * isolated DB client via getTenantClientBySlug, and processes independently.
 */
export function startSnapshotWorker() {
  logger.info('Snapshot worker started — interval: 15 minutes');

  async function runSnapshot() {
    try {
      // Get all active tenants from core DB
      const tenants = await coreDb.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          slug: true,
          databaseHost: true,
          databaseName: true,
          databaseUser: true,
          databasePassword: true,
          databasePort: true,
          databaseSSL: true,
          databaseConnectionUrl: true,
        },
      });

      for (const tenant of tenants) {
        try {
          const tenantDb = await getTenantClientBySlug(
            tenant.slug,
            {
              databaseHost: tenant.databaseHost,
              databaseName: tenant.databaseName,
              databaseUser: tenant.databaseUser,
              databasePassword: tenant.databasePassword,
              databasePort: tenant.databasePort,
              databaseSSL: tenant.databaseSSL,
              databaseConnectionUrl: tenant.databaseConnectionUrl,
            },
            tenant.id
          );

          // Get active elections with poll date = today for this tenant
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const elections = await (tenantDb as any).election.findMany({
            where: {
              status: 'ACTIVE',
              pollDate: { gte: today, lt: tomorrow },
            },
            select: { id: true, name: true, totalVoters: true },
          });

          for (const election of elections) {
            await captureElectionSnapshot(tenantDb, election);
          }
        } catch (tenantError) {
          logger.error({ err: tenantError, tenantSlug: tenant.slug }, 'Snapshot worker: tenant processing error');
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Snapshot worker error');
    }
  }

  async function captureElectionSnapshot(tenantDb: any, election: { id: string; name: string; totalVoters: number }) {
    const snapshotTime = new Date();
    const electionId = election.id;

    try {
      // Get booth-wise turnout with gender breakdown
      const booths = await (tenantDb as any).booth.findMany({
        where: { electionId },
        select: {
          id: true,
          boothNumber: true,
          totalVoters: true,
          maleVoters: true,
          femaleVoters: true,
          otherVoters: true,
        },
      });

      let electionTotalVoted = 0;
      let electionMaleVoted = 0;
      let electionFemaleVoted = 0;
      let electionOtherVoted = 0;

      const snapshotRecords: any[] = [];

      for (const booth of booths) {
        // Count votes with gender join
        const votedCount = await (tenantDb as any).pollDayVote.count({
          where: { electionId, boothId: booth.id, hasVoted: true },
        });

        // Gender breakdown — join with voter if available
        const genderCounts = await (tenantDb as any).pollDayVote.findMany({
          where: { electionId, boothId: booth.id, hasVoted: true, voterId: { not: null } },
          select: { voter: { select: { gender: true } } },
        });

        let maleVoted = 0, femaleVoted = 0, otherVoted = 0;
        for (const v of genderCounts) {
          if (v.voter?.gender === 'MALE') maleVoted++;
          else if (v.voter?.gender === 'FEMALE') femaleVoted++;
          else otherVoted++;
        }

        const percentage = booth.totalVoters > 0
          ? Math.round((votedCount / booth.totalVoters) * 1000) / 10
          : 0;

        snapshotRecords.push({
          electionId,
          boothId: booth.id,
          snapshotTime,
          totalVoters: booth.totalVoters,
          totalVoted: votedCount,
          maleVoted,
          femaleVoted,
          otherVoted,
          percentage,
        });

        electionTotalVoted += votedCount;
        electionMaleVoted += maleVoted;
        electionFemaleVoted += femaleVoted;
        electionOtherVoted += otherVoted;
      }

      // Add election-wide snapshot (boothId = null)
      snapshotRecords.push({
        electionId,
        boothId: null,
        snapshotTime,
        totalVoters: election.totalVoters,
        totalVoted: electionTotalVoted,
        maleVoted: electionMaleVoted,
        femaleVoted: electionFemaleVoted,
        otherVoted: electionOtherVoted,
        percentage: election.totalVoters > 0
          ? Math.round((electionTotalVoted / election.totalVoters) * 1000) / 10
          : 0,
      });

      // Batch insert snapshots
      await (tenantDb as any).turnoutSnapshot.createMany({
        data: snapshotRecords,
      });

      logger.info({ electionId, boothCount: booths.length, totalVoted: electionTotalVoted }, 'Snapshot captured');

      // Anomaly detection: compare with previous snapshot
      await detectAnomalies(tenantDb, electionId, snapshotRecords, snapshotTime);

      // Check for silent agents
      await checkSilentAgents(tenantDb, electionId);

      // Broadcast snapshot complete
      await broadcastEvent('snapshot_complete', electionId, {
        electionId,
        snapshotTime: snapshotTime.toISOString(),
        totalVoted: electionTotalVoted,
        percentage: snapshotRecords[snapshotRecords.length - 1]?.percentage ?? 0,
      });
    } catch (error) {
      logger.error({ err: error, electionId }, 'Snapshot capture error for election');
    }
  }

  async function detectAnomalies(tenantDb: any, electionId: string, currentSnapshots: any[], snapshotTime: Date) {
    try {
      // Get previous snapshot (15 min ago)
      const prevTime = new Date(snapshotTime.getTime() - SNAPSHOT_INTERVAL - 60000); // 16 min ago buffer
      const previousSnapshots = await (tenantDb as any).turnoutSnapshot.findMany({
        where: {
          electionId,
          boothId: { not: null },
          snapshotTime: { gte: prevTime, lt: snapshotTime },
        },
      });

      if (previousSnapshots.length === 0) return;

      const prevMap = new Map<string, any>(previousSnapshots.map((s: any) => [s.boothId, s]));

      for (const current of currentSnapshots) {
        if (!current.boothId) continue; // skip election-wide
        const prev = prevMap.get(current.boothId);
        if (!prev) continue;

        const voteDelta = current.totalVoted - prev.totalVoted;
        const percentDelta = current.percentage - prev.percentage;

        // Anomaly: sudden spike (>20% jump in 15 min)
        if (percentDelta > 20) {
          await broadcastEvent('anomaly_detected', electionId, {
            electionId,
            boothId: current.boothId,
            type: 'SPIKE',
            message: `Booth ${current.boothId}: ${percentDelta.toFixed(1)}% jump in 15 min (${voteDelta} votes)`,
            severity: 'HIGH',
          });
        }

        // Anomaly: complete stall (0 votes in 15 min when turnout is < 60%)
        if (voteDelta === 0 && current.percentage < 60 && current.percentage > 0) {
          await broadcastEvent('anomaly_detected', electionId, {
            electionId,
            boothId: current.boothId,
            type: 'STALL',
            message: `Booth ${current.boothId}: No votes recorded in 15 min (stalled at ${current.percentage}%)`,
            severity: 'MEDIUM',
          });
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Anomaly detection error');
    }
  }

  async function checkSilentAgents(tenantDb: any, electionId: string) {
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60000);
      const silentAgents = await (tenantDb as any).boothAgent.findMany({
        where: {
          electionId,
          isActive: true,
          checkedInAt: { not: null },
          OR: [
            { lastActiveAt: { lt: thirtyMinAgo } },
            { lastActiveAt: null },
          ],
        },
        select: { id: true, name: true, boothId: true },
      });

      for (const agent of silentAgents) {
        await broadcastEvent('agent_silent_alert', electionId, {
          electionId,
          agentId: agent.id,
          name: agent.name,
          boothId: agent.boothId,
          timestamp: new Date().toISOString(),
        });
      }

      if (silentAgents.length > 0) {
        logger.warn({ electionId, count: silentAgents.length }, 'Silent agents detected');
      }
    } catch (error) {
      logger.error({ err: error }, 'Silent agent check error');
    }
  }

  async function broadcastEvent(event: string, electionId: string, data: any) {
    try {
      await fetch(`${GATEWAY_URL}/internal/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          event,
          namespace: '/ws/poll-day',
          room: `election:${electionId}`,
          data,
        }),
      });
    } catch (error) {
      // Silent fail — gateway might not be running
      logger.debug({ err: error, event }, 'Failed to broadcast event');
    }
  }

  // Run immediately once, then every 15 minutes
  const timer = setInterval(runSnapshot, SNAPSHOT_INTERVAL);

  // Return cleanup function
  return () => {
    clearInterval(timer);
    logger.info('Snapshot worker stopped');
  };
}
