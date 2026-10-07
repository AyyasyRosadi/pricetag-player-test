import { useEffect } from 'react'
import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'

/**
 * SKU widget — ported from
 * `pt-player/src/components/atoms/object-sku/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 */
export default function SkuObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: ItemsTypes.ItemsContent }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.SkuNumber>(
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
        whiteSpace: 'pre',
        textAlign: properties.textAlignment,
        width: data.width,
        height: data.height,
        margin: 0,
      }}
    >
      {value?.sku_number || 'SKU NUMBER'}
    </p>
  )
}
