export interface User {
  id: string;
  email: string;
  name: string | null;
  height_cm: number | null;
  weight_start_kg: number | null;
  goal: string | null;
  is_admin?: boolean;
  dietary_profile?: string[];
  allergies?: string[];
  wake_time?: string;
  sleep_time?: string;
  work_start?: string;
  work_end?: string;
  work_type?: "bureau" | "domicile" | "variable" | "nuit" | "sans_emploi";
  commute_minutes?: number;
  has_family?: boolean;
  preferred_workout_time?: "matin" | "midi" | "soir";
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
