import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT e.id, e.status, e.created_at, ex.sender, ex.subject, ex.date, ra.risk_level
    FROM emails e
    LEFT JOIN extractions ex ON ex.email_id = e.id
    LEFT JOIN risk_assessments ra ON ra.email_id = e.id
    ORDER BY
      CASE ra.risk_level
        WHEN 'high'   THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low'    THEN 3
        WHEN 'none'   THEN 4
        ELSE 5
      END ASC,
      e.created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/emails/:id        — implemented in T029 (US3)
// POST /api/emails           — implemented in T035 (US4)
// POST /api/emails/:id/retry — implemented in T036 (US4)

export default router;
