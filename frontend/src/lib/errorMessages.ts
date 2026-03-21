/**
 * Map API error payloads to user-friendly French messages.
 */
export function getFriendlyError(error: unknown): string {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "";

  if (msg.includes("email already") || msg.includes("already in use")) {
    return "Cet email est déjà utilisé.";
  }
  if (msg.includes("Invalid") && (msg.includes("password") || msg.includes("credentials"))) {
    return "Email ou mot de passe incorrect.";
  }
  if (msg.includes("Missing required")) {
    return "Tous les champs sont obligatoires.";
  }
  if (msg.includes("Trop de requêtes") || msg.includes("Trop de tentatives")) {
    return "Trop de tentatives. Réessaie dans 15 minutes.";
  }
  if (msg.includes("Limite IA atteinte")) {
    return "Limite IA atteinte. Réessaie dans 1 heure.";
  }
  if (msg.includes("illisible") || msg.includes("meilleure lumière")) {
    return "Image illisible, essaie avec meilleure lumière.";
  }
  if (msg.includes("jwt expired") || msg.includes("expired token")) {
    return "Session expirée. Reconnecte-toi.";
  }
  if (msg.includes("Not allowed by CORS")) {
    return "Erreur de connexion au serveur.";
  }

  return msg || "Une erreur est survenue. Réessaie.";
}
