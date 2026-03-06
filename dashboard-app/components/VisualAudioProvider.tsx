'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import useSound from 'use-sound'
import confetti from 'canvas-confetti'

interface VisualAudioContextType {
    playClick: () => void
    playHover: () => void
    playSuccess: () => void
    triggerConfetti: () => void
}

const VisualAudioContext = createContext<VisualAudioContextType | undefined>(undefined)

export const VisualAudioProvider = ({ children }: { children: React.ReactNode }) => {
    // We'll use public/sounds/ path. If files don't exist yet, use-sound will just fail silently or we can provide empty src
    // For now, I'll use placeholders or just define them
    const [playClick] = useSound('/sounds/click.mp3', { volume: 0.5 })
    const [playHover] = useSound('/sounds/hover.mp3', { volume: 0.2 })
    const [playSuccess] = useSound('/sounds/success.mp3', { volume: 0.6 })

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#3b82f6', '#60a5fa']
        })
    }

    return (
        <VisualAudioContext.Provider value={{ playClick, playHover, playSuccess, triggerConfetti }}>
            {children}
        </VisualAudioContext.Provider>
    )
}

export const useVisualAudio = () => {
    const context = useContext(VisualAudioContext)
    if (!context) {
        throw new Error('useVisualAudio must be used within a VisualAudioProvider')
    }
    return context
}
