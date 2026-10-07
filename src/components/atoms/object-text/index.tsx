import { useEffect } from 'react'
import type { LayoutFrameTypes } from '@/types/frame'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Static text widget — ported from
 * `pt-player/src/components/atoms/object-text/{index,v1}.tsx`.
 *
 * Upstream splits a version dispatcher (`index.tsx`) from the `v1` renderer, but
 * both `switch` branches return `V1`, so the two files are collapsed here.
 *
 * The `isSelected` / `setWidth` / `setHeight` / `updateSize` props upstream
 * carries are CMS-editor affordances and are never read by the renderer, so they
 * are dropped (this project's tsconfig also rejects unused parameters).
 */
export default function TextObject({ data }: LayoutFrameTypes.ObjectProps) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.Text>(
    data.layout_zone_content.properties,
  )

  useEffect(() => {
    if (properties.fontFamily && properties.fontWeight) {
      loadFontWithCrossorigin(properties.fontFamily, properties.fontWeight)
    }
  }, [properties.fontFamily, properties.fontWeight])

  return (
    <p
      style={{
        fontSize: properties.fontSize + 'pt',
        color: properties.fontColor,
        background: properties.bgColor,
        fontFamily: properties.fontFamily + ', Arial',
        lineHeight: properties.lineHeight,
        fontWeight: properties.fontWeight,
        resize: 'none',
        overflow: 'hidden',
        width: data.width,
        height: data.height,
        outline: 'none',
        textAlign: properties.textAlignment,
        margin: 0,
      }}
    >
      {properties.text}
    </p>
  )
}
