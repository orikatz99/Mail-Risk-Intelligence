import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (_req, res) => {
  type NodeRow = {
    type: string;
    normalized_value: string;
    label: string;
    email_count: number;
  };

  const nodeRows = db.prepare(`
    SELECT
      type,
      normalized_value,
      MAX(value)              AS label,
      COUNT(DISTINCT email_id) AS email_count
    FROM entities
    GROUP BY type, normalized_value
  `).all() as NodeRow[];

  const nodes = nodeRows.map(row => ({
    id:          `${row.type}::${row.normalized_value}`,
    type:        row.type,
    label:       row.label,
    email_count: row.email_count,
  }));

  type EdgeRow = {
    relationship_type: string;
    source_type:  string;
    source_value: string;
    target_type:  string;
    target_value: string;
  };

  const edgeRows = db.prepare(`
    SELECT DISTINCT
      r.relationship_type,
      se.type             AS source_type,
      se.normalized_value AS source_value,
      te.type             AS target_type,
      te.normalized_value AS target_value
    FROM relationships r
    JOIN entities se ON se.id = r.source_entity_id
    JOIN entities te ON te.id = r.target_entity_id
  `).all() as EdgeRow[];

  const edges = edgeRows.map(row => {
    const source = `${row.source_type}::${row.source_value}`;
    const target = `${row.target_type}::${row.target_value}`;
    return {
      id:                `edge::${source}::${target}::${row.relationship_type}`,
      source,
      target,
      relationship_type: row.relationship_type,
    };
  });

  res.json({ nodes, edges });
});

export default router;
