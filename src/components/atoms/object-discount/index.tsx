import { useEffect } from 'react'
import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { isZeroPrice } from '@/utils/formatNumber'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Discount-price widget — ported from
 * `pt-player/src/components/atoms/object-discount/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * This widget doubles as the normal-price display: when `discount_price` is
 * zero it falls back to `item_price` rather than rendering an empty box.
 */
export default function DiscountObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: ItemsTypes.ItemsContent }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.ItemDiscount>(
    data.layout_zone_content.properties,
  )

  useEffect(() => {
    loadFontWithCrossorigin(properties.fontFamily)
  }, [properties.fontFamily])

  const noDiscount = isZeroPrice(value?.discount_price)
  const displayValue = noDiscount ? value?.item_price : value?.discount_price

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: properties.textAlignment,
        gap: '4pt',
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
      <p>{displayValue}</p>
    </div>
  )
}
