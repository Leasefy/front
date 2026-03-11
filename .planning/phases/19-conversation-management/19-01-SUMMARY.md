# Plan 19-01: Conversation List Panel with Date Grouping and Search

## Status: COMPLETE

## What Was Built

### Multi-Conversation State Management (`useBetaChat.ts`)
- Refactored from single `messages[]` to `Conversation[]` with `activeConversationId`
- localStorage persistence via `serializeConversations`/`deserializeConversations`
- CRUD: `createConversation`, `switchConversation`, `deleteConversation`
- Search: `searchQuery`, `setSearchQuery`, `filteredSummaries`
- Auto-title generation from first user message (truncated to 50 chars)
- Preview text from last message (truncated to 80 chars)
- Streaming state properly scoped to active conversation
- Timeout cleanup on conversation switch/delete

### Types (`beta-chat.ts`)
- Added `DateGroup` type: 'Hoy' | 'Ayer' | 'Esta semana' | 'Anterior'
- Added `ConversationSummary` for lightweight list display
- Added `SerializedConversation` for localStorage serialization

### ConversationList Component (`ConversationList.tsx`)
- Date-grouped conversation list (Hoy, Ayer, Esta semana, Anterior)
- Search input with magnifying glass icon
- ConversationItem with active highlight (indigo accent)
- Two-click delete: first click shows red confirm, second deletes
- Empty state with icon for no conversations / no search results
- Message count per conversation

### BetaSidebar Integration (`BetaSidebar.tsx`)
- ConversationList renders when "Conversaciones" tab is active
- "Nueva conversacion" button wired to `createConversation()`
- Placeholder text for future tabs (Agentes=Fase 20, Decisiones=Fase 21, Briefing=Fase 22)
- Tab content area between tabs and bottom buttons

## Files Changed
- `src/lib/types/beta-chat.ts` - Added DateGroup, ConversationSummary, SerializedConversation
- `src/lib/hooks/useBetaChat.ts` - Full rewrite for multi-conversation + localStorage
- `src/components/beta/ConversationList.tsx` - NEW: date-grouped list with search
- `src/components/beta/BetaSidebar.tsx` - Integrated ConversationList + wired create button

## Files Unchanged (backward-compatible)
- `src/lib/context/BetaChatContext.tsx` - Generic over UseBetaChatReturn, auto-exposes new fields
- `src/components/beta/ChatContainer.tsx` - Still uses `messages` from context (now derived from active conversation)
- `src/components/beta/BetaLayout.tsx` - Structure unchanged, sidebar already inside provider
