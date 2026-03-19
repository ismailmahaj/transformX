const { getUserById } = require("../db/queries/users");

async function verifyAdmin(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    const user = await getUserById(userId);
    if (!user?.is_admin) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { verifyAdmin };
