import { Fragment } from 'react'
import type { ChatVignetteData } from '@/lib/landing/types'

/**
 * WhatsApp-bubble vignette. Ports the standalone's `VG.chat` renderer
 * (`landing-standalone/index.html` ~L3695-3702, `.pchat`/`.pb(a|b)`/`.pmeta`).
 * Reuses the home phone-chat visual language (bubble alignment/color by
 * direction) per HANDOFF §PRODUCTS v3.
 */
export function ChatVignette({ data }: { data: ChatVignetteData }) {
  return (
    <div className="landing-vg-chat" data-testid="vg-chat">
      {data.messages.map((message, i) => (
        <Fragment key={i}>
          <div className={`landing-vg-chat__bubble landing-vg-chat__bubble--${message.direction}`}>
            {message.text}
          </div>
          {message.time && (
            <div className={`landing-vg-chat__meta landing-vg-chat__meta--${message.direction}`}>
              {message.time}
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}
