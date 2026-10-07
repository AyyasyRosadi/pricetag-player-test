import { useEffect } from 'react'
import Marquee from 'react-fast-marquee'
import type { LayoutFrameTypes } from '@/types/frame'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'
import './index.css'

/**
 * Running-text widget — ported from
 * `pt-player/src/components/atoms/object-running-text/{index,v1/v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * Two upstream constructs have no equivalent here and are substituted:
 *
 *   - `next/image` -> a plain `<img>`. `next/image` is a Next.js runtime
 *     component (`unoptimized` there means "do not run the optimiser", i.e. it
 *     behaves as a plain `<img>` anyway).
 *   - `styleV1.module.css` -> the local `index.css`. The module only defines
 *     `.container`, and CSS-module name hashing buys nothing for a single class.
 *     The two keyframes in that file are unused upstream (the animations that
 *     referenced them are commented out); they are not carried over.
 */
export default function RunningTextObject({ data }: LayoutFrameTypes.ObjectProps) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.RunningText>(
    data.layout_zone_content.properties,
  )

  const media = properties.icon_presigned
    ? { presignedUrl: properties.icon_presigned }
    : {
        presignedUrl:
          data.layout_zone_content.media?.file_path ||
          data.layout_zone_content.media?.presignedUrl,
      }

  useEffect(() => {
    loadFontWithCrossorigin(properties.fontFamily)
    // `properties.fontWeight` upstream is in the dependency list but not read
    // by the call; kept in the deps so the effect re-runs when it changes.
  }, [properties.fontFamily, properties.fontWeight])

  // Upstream wraps this in `useCallback` with a hand-written dependency list
  // that does not match what the React Compiler infers (`media` vs
  // `media?.presignedUrl`), which defeats the memoisation anyway. It renders
  // once per mount, so a plain function is both simpler and correct.
  const renderIcon = () => {
    if (!media?.presignedUrl) return null

    return (
      <span
        style={{
          marginLeft: properties.spaceBetween + 'px',
          marginRight: properties.spaceBetween + 'px',
          display: properties.icon ? 'inline-block' : 'none',
        }}
      >
        <img
          src={media.presignedUrl}
          alt="icon"
          style={{ width: properties.iconWidth + 'px', height: 'auto' }}
          draggable="false"
        />
      </span>
    )
  }

  return (
    <Marquee
      direction={properties.runFrom}
      speed={properties.duration * 10}
      className="running-text"
      style={{
        position: 'relative',
        backgroundColor: properties.backgroundColor,
        height: '100%',
        zIndex: 1000,
      }}
      autoFill
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <p
          style={{
            fontSize: properties.fontSize + 'pt',
            fontFamily: properties.fontFamily,
            fontWeight: properties.fontWeight,
            color: properties.fontColor,
            marginLeft: '20px',
            marginRight: '20px',
          }}
        >
          {properties.text}
        </p>
        {renderIcon()}
      </div>
    </Marquee>
  )
}
