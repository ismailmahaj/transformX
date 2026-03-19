import { api } from "./api";

const prefix = "/admin";

export interface AdminStats {
  total_users: number;
  active_users_7d: number;
  total_workouts_completed: number;
  total_meals_logged: number;
  average_streak: number;
  new_users_this_week: number;
  new_users_by_week: Array<{ week_start: string; count: number }>;
  workouts_by_day: Array<{ date: string; count: number }>;
}

export function fetchAdminStats() {
  return api.get<AdminStats>(`${prefix}/stats`).then((r) => r.data);
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  goal: string | null;
  is_admin: boolean;
  created_at: string;
  current_day: number;
  current_streak: number;
  workouts_done: number;
  meals_done: number;
}

export function fetchAdminUsers(params?: { page?: number; limit?: number }) {
  return api
    .get<{ users: AdminUser[]; total: number; page: number; limit: number; total_pages: number }>(
      `${prefix}/users`,
      { params }
    )
    .then((r) => r.data);
}

export function deleteAdminUser(id: string) {
  return api.delete(`${prefix}/users/${id}`);
}

export function setAdminUserAdmin(id: string, is_admin: boolean) {
  return api.put<{ id: string; is_admin: boolean }>(`${prefix}/users/${id}/admin`, {
    is_admin,
  });
}

export interface AdminWorkout {
  id: string;
  day_number: number;
  phase: number;
  goal_type: string;
  name: string;
  is_rest_day: boolean;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    rest_seconds?: number;
    note?: string;
  }>;
  exercises_count?: number;
}

export function fetchAdminWorkouts(params?: {
  phase?: number;
  goal_type?: string;
  day_min?: number;
  day_max?: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return api
    .get<{
      workouts: AdminWorkout[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>(`${prefix}/workouts`, { params })
    .then((r) => r.data);
}

export function createAdminWorkout(body: {
  day_number: number;
  phase: number;
  goal_type: "crossfit" | "muscle" | "mixed";
  name: string;
  is_rest_day?: boolean;
  exercises?: Array<{ name: string; sets?: number; reps?: number; rest_seconds?: number; note?: string }>;
}) {
  return api.post<AdminWorkout>(`${prefix}/workouts`, body).then((r) => r.data);
}

export function updateAdminWorkout(
  id: string,
  body: Partial<{
    day_number: number;
    phase: number;
    goal_type: "crossfit" | "muscle" | "mixed";
    name: string;
    is_rest_day: boolean;
    exercises: Array<{ name: string; sets?: number; reps?: number; rest_seconds?: number; note?: string }>;
  }>
) {
  return api.put<AdminWorkout>(`${prefix}/workouts/${id}`, body).then((r) => r.data);
}

export function deleteAdminWorkout(id: string) {
  return api.delete(`${prefix}/workouts/${id}`);
}

export interface AdminMeal {
  id: string;
  day_number: number;
  type: string;
  name: string;
  ingredients: Array<{ name: string; quantity?: number | string; unit?: string }>;
  recipe: string | null;
  prep_time_minutes: number;
  difficulty: string | null;
  macros: { calories?: number; proteins_g?: number; carbs_g?: number; fats_g?: number };
}

export function fetchAdminMeals(params?: {
  day_min?: number;
  day_max?: number;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return api
    .get<{
      meals: AdminMeal[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>(`${prefix}/meals`, { params })
    .then((r) => r.data);
}

export function createAdminMeal(body: {
  day_number: number;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  prep_time_minutes?: number;
  difficulty?: string;
  ingredients?: Array<{ name: string; quantity: number | string; unit?: string }>;
  recipe?: string;
  macros?: { calories?: number; proteins_g?: number; carbs_g?: number; fats_g?: number };
}) {
  return api.post<AdminMeal>(`${prefix}/meals`, body).then((r) => r.data);
}

export function updateAdminMeal(
  id: string,
  body: Partial<{
    day_number: number;
    type: "breakfast" | "lunch" | "dinner" | "snack";
    name: string;
    prep_time_minutes: number;
    difficulty: string;
    ingredients: Array<{ name: string; quantity: number | string; unit?: string }>;
    recipe: string;
    macros: Record<string, number>;
  }>
) {
  return api.put<AdminMeal>(`${prefix}/meals/${id}`, body).then((r) => r.data);
}

export function deleteAdminMeal(id: string) {
  return api.delete(`${prefix}/meals/${id}`);
}

export interface AdminBadge {
  id: string;
  emoji: string;
  name: string;
  description: string | null;
  condition_type: string;
  threshold: number;
  created_at?: string;
}

export function fetchAdminBadges() {
  return api.get<{ badges: AdminBadge[] }>(`${prefix}/badges`).then((r) => r.data);
}

export function createAdminBadge(body: {
  emoji?: string;
  name: string;
  description?: string;
  condition_type: "workouts_done" | "streak" | "day_reached" | "xp_total";
  threshold: number;
}) {
  return api.post<AdminBadge>(`${prefix}/badges`, body).then((r) => r.data);
}

export function updateAdminBadge(
  id: string,
  body: Partial<{
    emoji: string;
    name: string;
    description: string;
    condition_type: "workouts_done" | "streak" | "day_reached" | "xp_total";
    threshold: number;
  }>
) {
  return api.put<AdminBadge>(`${prefix}/badges/${id}`, body).then((r) => r.data);
}
