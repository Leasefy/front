import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import {
  scoreThenMatch,
  matchOnRejection,
  dailyNoApplicantsScan,
} from '@/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scoreThenMatch,
    matchOnRejection,
    dailyNoApplicantsScan,
  ],
})
