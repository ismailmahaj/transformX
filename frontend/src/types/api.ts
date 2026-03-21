export interface WorkoutExercise {
  name?: string;
  sets?: number | string;
  reps?: number | string;
  time?: string;
  rest_seconds?: number;
  note?: string;
  video_id?: string | null;
  youtube_url?: string | null;
}

export interface Workout {
  id: string;
  day_number: number;
  phase: number;
  goal_type: string;
  name: string;
  is_rest_day: boolean;
  exercises: WorkoutExercise[];
}

export interface Meal {
  id: string;
  day_number: number;
  type: string;
  name: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }> | unknown[];
  recipe: string | null;
  prep_time_minutes?: number | null;
  difficulty?: string | null;
  macros?: {
    calories: number;
    proteins_g: number;
    carbs_g: number;
    fats_g: number;
  } | null;
}

export interface ProgressEntry {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  measurements: Record<string, number>;
  created_at: string;
}

export interface UserLog {
  id: string;
  user_id: string;
  date: string;
  day_number: number;
  workout_done: boolean;
  meals_done: boolean;
  xp_earned: number;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_log_date: string | null;
  updated_at: string;
}
