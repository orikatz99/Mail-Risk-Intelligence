import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Graph, layout as dagreLayout } from '@dagrejs/dagre'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeProps,
} from 'reactflow'
import type { GraphResponse } from '../types'
import { getGraph } from '../services/api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

// ─── Custom node ─────────────────────────────────────────────────────────────

type EmailNodeData = { label: string; type: string; emailCount: number }

function EmailNode({ data }: NodeProps<EmailNodeData>) {
  return (
    <div className="min-w-[120px] rounded border border-gray-300 bg-white px-3 py-2 shadow-sm">
      <Handle type="target" position={Position.Left} style={{ background: '#94a3b8' }} />
      <p className="truncate text-xs font-medium text-gray-900">{data.label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">
          {data.type}
        </span>
        <span className="text-[10px] text-gray-400">
          {data.emailCount} email{data.emailCount !== 1 ? 's' : ''}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#94a3b8' }} />
    </div>
  )
}

const nodeTypes = { emailNode: EmailNode }

// ─── Layout helpers ───────────────────────────────────────────────────────────

const NODE_W = 160
const NODE_H = 60

function computeDagrePositions(
  nodes: GraphResponse['nodes'],
  edges: GraphResponse['edges'],
): Record<string, { x: number; y: number }> {
  const g = new Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 50, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagreLayout(g)

  const positions: Record<string, { x: number; y: number }> = {}
  for (const node of nodes) {
    const pos = g.node(node.id)
    positions[node.id] = {
      x: (pos.x ?? 0) - NODE_W / 2,
      y: (pos.y ?? 0) - NODE_H / 2,
    }
  }
  return positions
}

// ─── Graph canvas ─────────────────────────────────────────────────────────────

function makeRFEdges(edges: GraphResponse['edges'], selectedNodeId: string | null): RFEdge[] {
  return edges.map(edge => {
    const connected =
      selectedNodeId !== null &&
      (edge.source === selectedNodeId || edge.target === selectedNodeId)
    return {
      id:             edge.id,
      source:         edge.source,
      target:         edge.target,
      type:           'smoothstep',
      label:          connected ? edge.relationship_type : undefined,
      style:          { stroke: connected ? '#3b82f6' : '#94a3b8', strokeWidth: connected ? 2 : 1 },
      labelStyle:     { fontSize: 10, fill: '#64748b' },
      labelBgStyle:   { fill: '#ffffff' },
      labelBgPadding: [4, 2] as [number, number],
    }
  })
}

function GraphView({ data }: { data: GraphResponse }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const initialNodes = useMemo((): RFNode<EmailNodeData>[] => {
    const positions = computeDagrePositions(data.nodes, data.edges)
    return data.nodes.map(node => ({
      id:       node.id,
      position: positions[node.id],
      type:     'emailNode',
      data:     { label: node.label, type: node.type, emailCount: node.email_count },
    }))
  }, [data.nodes, data.edges])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(makeRFEdges(data.edges, null))

  useEffect(() => {
    setEdges(makeRFEdges(data.edges, selectedNodeId))
  }, [selectedNodeId, data.edges, setEdges])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodesDraggable={false}
      nodesConnectable={false}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GraphPage() {
  const [data, setData] = useState<GraphResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await getGraph()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Knowledge Graph</h1>
      </div>

      {error ? (
        <div className="flex-1">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : data?.nodes.length === 0 ? (
        <div className="flex-1">
          <EmptyState message="No entities yet — process some emails first." />
        </div>
      ) : (
        <div className="flex-1">
          <GraphView data={data!} />
        </div>
      )}
    </div>
  )
}
