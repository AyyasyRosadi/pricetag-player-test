import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Barcode / QR widget — ported from
 * `pt-player/src/components/atoms/object-barcode/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * Renders a QR code or a 1-D barcode depending on `properties.type`.
 *
 * Upstream passes Tailwind classes (`className="w-full h-full border bg-white
 * margin-0"`) to `<Barcode>`; this project has no Tailwind build, so the same
 * declarations are applied as inline styles on a wrapper instead. `margin-0` is
 * not a Tailwind class at all upstream, so it never did anything.
 */
export default function BarcodeObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: ItemsTypes.ItemsContent }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.Barcode>(
    data.layout_zone_content.properties,
  )

  if (properties.type === 'qr') {
    return (
      <QRCodeSVG
        marginSize={1}
        value={value?.qr}
        style={{ width: '100%', height: '100%', margin: 0 }}
      />
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', border: '1px solid #000000', background: '#ffffff', margin: 0 }}>
      <Barcode marginLeft={0} value={value?.barcode} />
    </div>
  )
}
