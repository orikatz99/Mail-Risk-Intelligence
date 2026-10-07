import type { Entity, EntityType, Relationship } from '../types'
import EmptyState from './EmptyState'

interface Props {
  entities: Entity[]
  relationships: Relationship[]
}

const TYPE_LABELS: Record<EntityType, string> = {
  person:       'People',
  organization: 'Organizations',
  amount:       'Amounts',
  account:      'Accounts',
  location:     'Locations',
}

export default function EntityPanel({ entities, relationships }: Props) {
  if (entities.length === 0) {
    return <EmptyState message="No entities found." />
  }

  const byType = entities.reduce<Partial<Record<EntityType, Entity[]>>>((acc, entity) => {
    if (!acc[entity.type]) acc[entity.type] = []
    acc[entity.type]!.push(entity)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {(Object.entries(byType) as [EntityType, Entity[]][]).map(([type, group]) => (
        <div key={type}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {TYPE_LABELS[type]}
          </h3>
          <ul className="mt-2 space-y-2">
            {group.map(entity => {
              const outgoing = relationships.filter(r => r.source_entity_id === entity.id)
              const incoming = relationships.filter(r => r.target_entity_id === entity.id)

              return (
                <li key={entity.id} className="rounded border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">{entity.value}</p>
                  {outgoing.map(rel => {
                    const target = entities.find(e => e.id === rel.target_entity_id)
                    return target ? (
                      <p key={rel.id} className="mt-1 text-xs text-gray-500">
                        → <span className="italic">{rel.relationship_type}</span> → {target.value}
                      </p>
                    ) : null
                  })}
                  {incoming.map(rel => {
                    const source = entities.find(e => e.id === rel.source_entity_id)
                    return source ? (
                      <p key={rel.id} className="mt-1 text-xs text-gray-500">
                        ← <span className="italic">{rel.relationship_type}</span> ← {source.value}
                      </p>
                    ) : null
                  })}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
