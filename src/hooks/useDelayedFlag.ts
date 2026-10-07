import { useEffect, useState } from 'react'

/**
 * True only once `active` has stayed true for `delayMs`; false again as soon as
 * it goes false.
 *
 * Used to keep a transient condition from flashing on screen — e.g. the socket
 * is briefly "not connected" during a normal cold start, and an offline notice
 * that appeared for 300ms would read as a fault.
 *
 * Both transitions go through a timer on purpose. Setting the flag directly in
 * the effect body for the `active === false` branch would be a synchronous
 * `setState` inside an effect, which starts a second render for no reason (and
 * is what `react-hooks/set-state-in-effect` flags). A 0ms timer is still a
 * timer, so the flag clears on the next tick — visually immediate.
 */
export const useDelayedFlag = (active: boolean, delayMs: number): boolean => {
  const [flag, setFlag] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFlag(active), active ? delayMs : 0)
    return () => clearTimeout(timer)
  }, [active, delayMs])

  return flag
}

export default useDelayedFlag
