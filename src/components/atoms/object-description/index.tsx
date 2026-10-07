import { useEffect } from 'react'
import type { LayoutFrameTypes } from '@/types/frame'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Description-text widget — ported from
 * `pt-player/src/components/atoms/object-description/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * Unlike the other text widgets its content is not a property: it comes from
 * `displayItems.widgetDescriptions[binding - 1]`, resolved by the frame
 * renderer and handed down as `value`.
 */
export default function DescriptionTextObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: string }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.DescriptionText>(
    data.layout_zone_content.properties,
  )

  useEffect(() => {
    loadFontWithCrossorigin(properties.fontFamily)
  }, [properties.fontFamily])

  return (
    <p
      style={{
        fontSize: properties.fontSize + 'pt',
        color: properties.fontColor,
        fontFamily: properties.fontFamily + ', Arial',
        lineHeight: properties.lineHeight,
        fontWeight: properties.fontWeight,
        textAlign: properties.textAlignment,
        width: data.width,
        height: data.height,
        margin: 0,
      }}
    >
      {value}
    </p>
  )
}
