import { useEffect, useRef } from 'react'
import { ActivityIcon } from '@/components/ui/animated/activity'
import { GitPullRequestIcon } from '@/components/ui/animated/git-pull-request'
import { LayersIcon } from '@/components/ui/animated/layers'
import { RouteIcon } from '@/components/ui/animated/route'

/** The icon of each tool, in the loop's order: plan, framework, review, monitor. */
const icons = [RouteIcon, LayersIcon, GitPullRequestIcon, ActivityIcon]

type Handle = { startAnimation: () => void; stopAnimation: () => void }

interface Props {
  /** Its place in the loop: it animates on its own beat. */
  index: number
  /** How long each tool's beat lasts, and how many tools share the loop. */
  beatMs?: number
  count?: number
}

/**
 * A tool's animated icon. It plays on its beat, in step with the CSS that lights its tile
 * (both count from the page's start), and on hover.
 */
export default function ToolIcon({ index, beatMs = 2000, count = 4 }: Props) {
  const ref = useRef<Handle>(null)
  const Icon = icons[index]

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cycle = beatMs * count
    const play = () => ref.current?.startAnimation()
    let interval: number | undefined
    // Until its next beat, counted from the page's timeline, which the CSS animations share.
    const now = Number(document.timeline.currentTime ?? performance.now())
    const wait = (((index * beatMs + 250 - now) % cycle) + cycle) % cycle
    const timeout = window.setTimeout(() => {
      play()
      interval = window.setInterval(play, cycle)
    }, wait)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [index, beatMs, count])

  return (
    <Icon
      ref={ref}
      size={30}
      className="flex items-center justify-center"
      onMouseEnter={() => ref.current?.startAnimation()}
    />
  )
}
