export interface User {
  id: string;
  email: string;
  name: string | null;
  height_cm: number | null;
  weight_start_kg: number | null;
  goal: string | null;
  is_admin?: boolean;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
