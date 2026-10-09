'use client'

import { useState, useEffect } from 'react'
import type { OrgPlan, PlanLimits } from '@/lib/plans'

interface PlanData {
  plan: OrgPlan
  limits: PlanLimits
  subscriptionStatus: string | null
  trialEndsAt: string | null
}

const DEFAULT: PlanData = {
  plan: 'FREE',
  limits: { projects: 3, members: 5, ai: false, github: false, documents: false },
  subscriptionStatus: null,
  trialEndsAt: null,
}

let _cache: PlanData | null = null
let _promise: Promise<PlanData> | null = null

async function fetchPlan(): Promise<PlanData> {
  if (_cache) return _cache
  if (!_promise) {
    _promise = fetch('/api/billing/plan').then(r => r.ok ? r.json() : DEFAULT).catch(() => DEFAULT)
  }
  _cache = await _promise
  return _cache!
}

export function usePlan() {
  const [data, setData] = useState<PlanData>(DEFAULT)

  useEffect(() => {
    fetchPlan().then(setData)
  }, [])

  return data
}

export function invalidatePlanCache() {
  _cache = null
  _promise = null
}
