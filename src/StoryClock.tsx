import { createContext, useContext, useState, type ReactNode } from 'react'
import { DEFAULT_STAGE, happenedBefore, type Moment, type StoryStage, type Timestamp } from './demo-data'

// The story moment, Seller and focus records of the current guided-flow step (the 10:25 snapshot outside a flow).
// Each flow step remounts its section, so surfaces read this once when they mount. It holds no demo facts itself.
const StoryContext = createContext<StoryStage>(DEFAULT_STAGE)

export function StoryProvider({ stage, children }: { stage: StoryStage; children: ReactNode }) {
  return <StoryContext.Provider value={stage}>{children}</StoryContext.Provider>
}

export function useStory(): StoryStage {
  return useContext(StoryContext)
}

/**
 * The step's story moment, for a surface where the user performs the step's documented events (a payment, a scan):
 * `advanceTo(event)` moves it to just after that event, so the screens that follow show the state after it.
 * It never moves back.
 */
export function useStoryMoment(): [Moment, (event: Moment | Timestamp) => void] {
  const story = useStory()
  const [at, setAt] = useState<Moment>(story.moment)
  const advanceTo = (event: Moment | Timestamp) => {
    const after = typeof event === 'string' ? { at: event, sequence: 1 } : { at: event.at, sequence: (event.sequence ?? 0) + 1 }
    setAt(current => (happenedBefore(current, after) ? after : current))
  }
  return [at, advanceTo]
}
