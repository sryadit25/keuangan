import type { Goal, GoalContribution } from '@/lib/db/types';

export interface GoalProgress {
  goal: Goal;
  saved: number;
  remaining: number;
  ratio: number;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  onTrack: boolean;
}

export function savedForGoal(goalId: string, contributions: GoalContribution[]): number {
  return contributions
    .filter((c) => c.goal_id === goalId)
    .reduce((sum, c) => sum + Number(c.amount), 0);
}

export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function goalProgress(
  goal: Goal,
  contributions: GoalContribution[],
  currentPeriod: string,
): GoalProgress {
  const saved = savedForGoal(goal.id, contributions);
  const target = Number(goal.target_amount);
  const remaining = Math.max(target - saved, 0);
  const monthsLeft = goal.target_date ? Math.max(monthsBetween(currentPeriod, goal.target_date.slice(0, 7)), 0) : null;

  let monthlyNeeded: number | null = null;
  if (monthsLeft !== null && monthsLeft > 0 && remaining > 0) {
    monthlyNeeded = remaining / monthsLeft;
  }

  return {
    goal,
    saved,
    remaining,
    ratio: target > 0 ? Math.min(saved / target, 1) : 0,
    monthsLeft,
    monthlyNeeded,
    onTrack: monthlyNeeded === null ? true : remaining === 0,
  };
}

export function goalProgressList(
  goals: Goal[],
  contributions: GoalContribution[],
  currentPeriod: string,
): GoalProgress[] {
  return goals
    .filter((g) => g.status === 'active')
    .map((goal) => goalProgress(goal, contributions, currentPeriod))
    .sort((a, b) => a.goal.priority - b.goal.priority);
}
