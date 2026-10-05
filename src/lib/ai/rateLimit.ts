import "server-only";

export interface RateLimitCheckParams {
  userId: string;
  now?: Date;
  fetchUserRequests: (params: {
    userId: string;
    since: Date;
  }) => Promise<Array<{ id: string; created_at: string; status: string }>>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: "hourly_limit" | "daily_limit" | "concurrency_limit";
}

export const AI_RATE_LIMIT_PER_HOUR = 15;
export const AI_RATE_LIMIT_PER_DAY = 60;

export async function checkAIRateLimit(
  params: RateLimitCheckParams
): Promise<RateLimitResult> {
  const { userId, now = new Date(), fetchUserRequests } = params;

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoMinsAgo = new Date(now.getTime() - 2 * 60 * 1000);

  const requests = await fetchUserRequests({ userId, since: dayAgo });

  // 1. Concurrency Check: >= 2 rows with status='pending' created in last 2 minutes
  const recentPending = requests.filter(
    (r) =>
      r.status === "pending" && new Date(r.created_at).getTime() >= twoMinsAgo.getTime()
  );

  if (recentPending.length >= 2) {
    return {
      allowed: false,
      reason: "concurrency_limit",
      retryAfterSeconds: 30,
    };
  }

  // 2. Hourly Check: <= 15 requests in rolling hour
  const hourlyRequests = requests.filter(
    (r) => new Date(r.created_at).getTime() >= hourAgo.getTime()
  );

  if (hourlyRequests.length >= AI_RATE_LIMIT_PER_HOUR) {
    // Oldest in the hourly window
    const sortedHourly = [...hourlyRequests].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const oldest = new Date(sortedHourly[0].created_at);
    const expiresAt = new Date(oldest.getTime() + 60 * 60 * 1000);
    const retryAfter = Math.max(
      1,
      Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)
    );

    return {
      allowed: false,
      reason: "hourly_limit",
      retryAfterSeconds: retryAfter,
    };
  }

  // 3. Daily Check: <= 60 requests in rolling 24h
  if (requests.length >= AI_RATE_LIMIT_PER_DAY) {
    const sortedDaily = [...requests].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const oldest = new Date(sortedDaily[0].created_at);
    const expiresAt = new Date(oldest.getTime() + 24 * 60 * 60 * 1000);
    const retryAfter = Math.max(
      1,
      Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)
    );

    return {
      allowed: false,
      reason: "daily_limit",
      retryAfterSeconds: retryAfter,
    };
  }

  return { allowed: true };
}
