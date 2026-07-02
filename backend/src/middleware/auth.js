import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  
  if (!header?.startsWith('Bearer ')) {
    // Graceful developer bypass fallback only if in dev environment and no header provided
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        id: '60c72b2f9b1d8b2d18c1d32f',
        email: 'vraj@example.com',
        name: 'Vraj',
        role: 'admin'
      };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
