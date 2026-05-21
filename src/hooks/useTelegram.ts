'use client'

import { useEffect, useState } from 'react'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isInTelegram, setIsInTelegram] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const WebApp = (await import('@twa-dev/sdk')).default
        if (WebApp.initData) {
          setIsInTelegram(true)
          setUser(WebApp.initDataUnsafe?.user ?? null)
        }
      } catch {
        setIsInTelegram(false)
      }
    }
    init()
  }, [])

  const showBackButton = (onClick: () => void) => {
    import('@twa-dev/sdk').then(({ default: WebApp }) => {
      WebApp.BackButton.show()
      WebApp.BackButton.onClick(onClick)
    })
  }

  const hideBackButton = () => {
    import('@twa-dev/sdk').then(({ default: WebApp }) => {
      WebApp.BackButton.hide()
    })
  }

  const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    import('@twa-dev/sdk').then(({ default: WebApp }) => {
      WebApp.HapticFeedback.impactOccurred(type)
    })
  }

  return { user, isInTelegram, showBackButton, hideBackButton, haptic }
}

