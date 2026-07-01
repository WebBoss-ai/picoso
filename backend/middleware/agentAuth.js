import jwt from 'jsonwebtoken';
import { Agent } from '../models/Model.js';

export const authenticateAgent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'agent') return res.status(403).json({ error: 'Agent access only' });
    const agent = await Agent.findById(decoded.agentId);
    if (!agent || !agent.isActive) return res.status(401).json({ error: 'Agent not found or inactive' });
    req.agent = agent;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
