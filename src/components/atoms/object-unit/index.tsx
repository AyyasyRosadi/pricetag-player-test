import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Unit-price widget — ported from
 * `pt-player/src/components/atoms/object-unit/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * Note this is the one text widget with no `loadFontWithCrossorigin` call
 * upstream, so it renders in the fallback font. Kept faithful.
 */
export default function UnitPriceObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: ItemsTypes.ItemsContent }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.UnitPrice>(
    data.layout_zone_content.properties,
  )

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
        textTransform: properties.unitTextTransform,
        whiteSpace: 'pre',
      }}
    >
      {properties.as === 'price'
        ? value?.unit_price
        : properties.as === 'general'
          ? value?.unit_price_general
          : value?.unit_price_discount}
    </p>
  )
}
