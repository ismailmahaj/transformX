export interface ScannedWodExercise {
  nom: string;
  series?: string | number | null;
  repetitions?: string | number | null;
  poids?: string | number | null;
  note?: string | number | null;
}

export interface ScannedWodData {
  nom: string;
  format: string;
  duree_estimee_minutes?: number | null;
  echauffement?: string;
  lisibilite?: string;
  exercices: ScannedWodExercise[];
  transitions: string[];
  notes_generales?: string;
  niveau?: string;
  muscles_cibles: string[];
}

export interface ScannedWodRow {
  id: string;
  user_id: string;
  date: string;
  wod_data: ScannedWodData;
  image_url: string | null;
  completed: boolean;
  score: string | null;
  notes: string | null;
  created_at: string;
}
