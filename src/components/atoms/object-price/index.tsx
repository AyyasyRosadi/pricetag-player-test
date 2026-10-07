import { useEffect } from 'react'
import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { isZeroPrice } from '@/utils/formatNumber'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Normal-price widget — ported from
 * `pt-player/src/components/atoms/object-price/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * Kept faithful, including an upstream oddity worth knowing about: the wrapper
 * sets `justifyContent` / `flexWrap` / `gap` but never `display: flex`, so those
 * three are inert and the price lays out as a block. Adding `display: flex`
 * would change the rendering relative to the CMS preview, so it is not done
 * here. `formatPrice` and the `currency` map upstream imports are unused there
 * too, and are dropped (this tsconfig rejects unused locals).
 */
export default function PriceObject({
  data,
  value,
  hasDiscountWidget,
}: LayoutFrameTypes.ObjectProps & {
  value: ItemsTypes.ItemsContent
  hasDiscountWidget?: boolean
}) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.ItemPrice>(
    data.layout_zone_content.properties,
  )

  useEffect(() => {
    loadFontWithCrossorigin(properties.fontFamily)
  }, [properties.fontFamily])

  // No discount -> the discount widget already renders the normal price, so
  // this one would only duplicate it.
  if (hasDiscountWidget && isZeroPrice(value?.discount_price)) return null

  return (
    <div
      style={{
        justifyContent: properties.textAlignment,
        flexWrap: 'wrap',
        gap: '4pt',
        fontSize: properties.fontSize + 'pt',
        color: properties.fontColor,
        fontFamily: properties.fontFamily + ', Arial',
        lineHeight: properties.lineHeight,
        fontWeight: properties.fontWeight,
        whiteSpace: 'pre',
        textAlign: properties.textAlignment,
        width: data.width,
        height: data.height,
        // without a discount there is nothing to cross out
        textDecoration:
          properties.priceCut ||
          (!isZeroPrice(value?.discount_price) &&
            value?.item_price !== value?.discount_price)
            ? 'line-through'
            : '',
        margin: 0,
      }}
    >
      <p>{value?.item_price}</p>
    </div>
  )
}
