export type GoalColor =
  | 'teal'
  | 'brand'
  | 'purple'
  | 'amber'
  | 'rose'
  | 'blue'
  | 'orange'
  | 'indigo';

export type GoalIcon =
  | 'piggy-bank'
  | 'home'
  | 'plane'
  | 'car'
  | 'graduation-cap'
  | 'laptop'
  | 'heart'
  | 'star'
  | 'shield'
  | 'zap';

export interface SavingsGoal {
  id: string;
  /** Display name for the goal */
  name: string;
  /** Optional short description */
  description?: string;
  /** Target amount in the user's currency */
  targetAmount: number;
  /** Current saved amount */
  savedAmount: number;
  /** ISO date string – the deadline the user wants to hit */
  targetDate?: string;
  /** UI accent colour */
  color: GoalColor;
  /** Icon slug */
  icon: GoalIcon;
  /** ISO date string – when the goal was created */
  createdAt: string;
  /** Milestones already celebrated (25 | 50 | 75 | 100) */
  celebratedMilestones: number[];
}
