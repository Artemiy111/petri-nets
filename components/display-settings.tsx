'use client'

import { createContext, useContext, type ReactNode } from 'react'

export interface DisplaySettings {
  showLabels: boolean
  showNumbers: boolean
}

const DisplaySettingsContext = createContext<DisplaySettings>({
  showLabels: true,
  showNumbers: true,
})

export function DisplaySettingsProvider({
  value,
  children,
}: {
  value: DisplaySettings
  children: ReactNode
}) {
  return <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>
}

export function useDisplaySettings() {
  return useContext(DisplaySettingsContext)
}
