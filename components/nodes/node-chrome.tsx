'use client'

import type { CSSProperties } from 'react'
import { Fragment } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { LabelPosition } from '@/lib/petri-net'

const SIDES = [
  { position: Position.Top, id: 'top' },
  { position: Position.Right, id: 'right' },
  { position: Position.Bottom, id: 'bottom' },
  { position: Position.Left, id: 'left' },
] as const

const LABEL_STYLES: Record<LabelPosition, CSSProperties> = {
  top: { top: '-25px', left: '50%', transform: 'translateX(-50%)' },
  right: { top: '50%', right: '-5px', transform: 'translate(100%, -50%)' },
  bottom: { bottom: '-25px', left: '50%', transform: 'translateX(-50%)' },
  left: { top: '50%', left: '-5px', transform: 'translate(-100%, -50%)' },
}

const BADGE_CLASSES =
  'absolute whitespace-nowrap px-1 text-xs bg-white/80 rounded border border-gray-200'

// Connection handles on all four sides
export function NodeHandles() {
  return SIDES.map(({ position, id }) => (
    <Fragment key={id}>
      <Handle type="source" position={position} id={id} className="size-3 bg-blue-500" />
      <Handle type="target" position={position} id={id} className="size-3 bg-blue-500" />
    </Fragment>
  ))
}

export function NodeLabel({ label, labelPosition }: { label: string; labelPosition: LabelPosition }) {
  return (
    <div className={BADGE_CLASSES} style={LABEL_STYLES[labelPosition]}>
      {label}
    </div>
  )
}

export function NodeNumber({ prefix, number }: { prefix: 'p' | 't'; number: number }) {
  return (
    <div
      className={BADGE_CLASSES}
      style={{ bottom: '-25px', left: '50%', transform: 'translateX(-50%)' }}
    >
      {prefix}
      <sub>{number + 1}</sub>
    </div>
  )
}
