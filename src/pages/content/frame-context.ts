import { createContext } from 'react'
import type { PlayerContent } from '@/types/player-content'

/**
 * Frame payload context — ported from `pt-player/src/page/content/index.tsx`,
 * moved into its own module.
 *
 * It has to live outside the component file because a module that exports both
 * a component and a non-component value breaks React Fast Refresh (the
 * `only-export-components` lint rule).
 *
 * Nothing consumes it yet — upstream it is read by the CMS editor's preview
 * card, which is not ported.
 */
export const FrameContext = createContext<PlayerContent.PlayerContentData | null>(
  null,
)
