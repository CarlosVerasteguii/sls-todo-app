"use client"

import { useState, useEffect } from "react"

interface CountdownTimerProps {
  dueAt: string
  className?: string
}

export function CountdownTimer({ dueAt, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isOverdue: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const due = new Date(dueAt).getTime()
      const difference = due - now

      if (difference < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isOverdue: false })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [dueAt])

  const getUrgencyColor = () => {
    if (timeLeft.isOverdue) return "text-red-400"
    if (timeLeft.days === 0 && timeLeft.hours < 2) return "text-red-400"
    if (timeLeft.days === 0 && timeLeft.hours < 6) return "text-orange-400"
    if (timeLeft.days === 0) return "text-yellow-400"
    return "text-green-400"
  }

  const formatTime = () => {
    if (timeLeft.isOverdue) return "Overdue"
    if (timeLeft.days > 0) return `${timeLeft.days}d ${timeLeft.hours}h`
    if (timeLeft.hours > 0) return `${timeLeft.hours}h ${timeLeft.minutes}m`
    return `${timeLeft.minutes}m ${timeLeft.seconds}s`
  }

  return <span className={`text-xs font-mono ${getUrgencyColor()} ${className}`}>{formatTime()}</span>
}
