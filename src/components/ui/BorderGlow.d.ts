import type { CSSProperties, ReactNode, FC, HTMLAttributes, MouseEventHandler } from 'react'

export interface BorderGlowProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  className?: string
  edgeSensitivity?: number
  glowColor?: string
  backgroundColor?: string
  borderRadius?: number
  glowRadius?: number
  glowIntensity?: number
  coneSpread?: number
  animated?: boolean
  colors?: string[]
  fillOpacity?: number
  style?: CSSProperties
  onClick?: MouseEventHandler<HTMLDivElement>
}

declare const BorderGlow: FC<BorderGlowProps>
export default BorderGlow
