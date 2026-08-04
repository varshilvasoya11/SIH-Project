// ==============================================
// Auth Middleware — JWT verification
// ==============================================

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

function doctorOnly(req, res, next) {
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access only' });
  }
  next();
}

function kioskOnly(req, res, next) {
  if (req.user?.role !== 'kiosk') {
    return res.status(403).json({ error: 'Kiosk access only' });
  }
  next();
}

module.exports = { authMiddleware, doctorOnly, kioskOnly };
