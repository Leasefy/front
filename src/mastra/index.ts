import { Mastra } from '@mastra/core'

import { tenantScoringAgent } from './agents/tenant-scoring'
import { smartMatchingAgent } from './agents/smart-matching'

import { extractDocumentTool } from './tools/extract-document'
import { querySupabaseTool } from './tools/query-supabase'
import { calculateScoreTool } from './tools/calculate-score'
import { searchPropertiesTool } from './tools/search-properties'
import { calculateCompatibilityTool } from './tools/calculate-compatibility'
import { sendNotificationTool } from './tools/send-notification'

import { tenantScoringWorkflow } from './workflows/tenant-scoring.workflow'
import { smartMatchingWorkflow } from './workflows/smart-matching.workflow'

export const mastra = new Mastra({
  agents: {
    'tenant-scoring': tenantScoringAgent,
    'smart-matching': smartMatchingAgent,
  },
  tools: {
    'extract-document': extractDocumentTool,
    'query-supabase': querySupabaseTool,
    'calculate-score': calculateScoreTool,
    'search-properties': searchPropertiesTool,
    'calculate-compatibility': calculateCompatibilityTool,
    'send-notification': sendNotificationTool,
  },
  workflows: {
    'tenant-scoring-pipeline': tenantScoringWorkflow,
    'smart-matching-pipeline': smartMatchingWorkflow,
  },
})
