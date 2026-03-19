const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || typeof header !== "string") {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid Authorization header" });
    }

    const secret = process.env.API_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfigured: missing JWT secret" });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { verifyToken };
