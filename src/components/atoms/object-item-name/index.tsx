import { useEffect } from 'react'
import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Item name widget — ported from
 * `pt-player/src/components/atoms/object-item-name/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 */
export default function ItemNameObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: ItemsTypes.ItemsContent }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.ItemName>(
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
      {value?.item_name || 'Item Name'}
    </p>
  )
}
