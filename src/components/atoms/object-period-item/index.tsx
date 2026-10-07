import dayjs from 'dayjs'
import { useEffect } from 'react'
import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { loadFontWithCrossorigin } from '@/utils/loadFont'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Period (date) widget — ported from
 * `pt-player/src/components/atoms/object-period-item/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * Uses `dayjs` with no plugins, which is ES5 and safe on the TV engines. The
 * format string comes from the CMS (`DD MMMM YYYY` etc.); anything dayjs cannot
 * parse renders as `Invalid Date`, same as upstream.
 */
export default function ItemPeriodObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: ItemsTypes.ItemsContent }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.PeriodItem>(
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
      {value?.period_item?.length
        ? dayjs(value.period_item).format(properties.format ?? 'DD MMMM YYYY')
        : ''}
    </p>
  )
}
