'use client'

import { useEffect } from 'react'

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initTelegram = async () => {
      if (typeof window === 'undefined') return

      try {
        const WebApp = (await import('@twa-dev/sdk')).default

        WebApp.expand()
        WebApp.setHeaderColor('#ffffff')
        WebApp.setBackgroundColor('#f9fafb')
        WebApp.enableClosingConfirmation()
        WebApp.ready()

        console.log('Telegram WebApp initialized:', WebApp.platform)
      } catch {
        // Not in Telegram WebApp.
        console.log('Not in Telegram WebApp')
      }
    }

    initTelegram()
  }, [])

  return <>{children}</>
}

