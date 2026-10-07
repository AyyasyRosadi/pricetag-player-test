import type { LayoutFrameTypes } from '@/types/frame'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Shape / rectangle widget — ported from
 * `pt-player/src/components/atoms/object-shape-rectangle/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * The dummy layout uses it as a decorative header: an inline base64 JPEG with
 * two rounded top corners (`borderType: "mixed"`).
 */
export default function ShapeRectangleObject({
  data,
}: LayoutFrameTypes.ObjectProps) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.ShapeRectangle>(
    data.layout_zone_content.properties,
  )

  // "mixed" splits the radius per corner — same order as the CMS writes it,
  // older layouts have no borderType and keep the single radius.
  const radius =
    properties?.borderType === 'mixed'
      ? `${properties.borderRadiusTL ?? 0}px ${properties.borderRadiusTR ?? 0}px ${properties.borderRadiusBR ?? 0}px ${properties.borderRadiusBL ?? 0}px`
      : `${properties.borderRadius}px`

  return properties?.isImage && properties?.imageFile ? (
    <img
      src={properties.imageFile}
      alt=""
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: radius,
        zIndex: properties.zIndex,
        margin: 0,
      }}
      draggable="false"
    />
  ) : (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: properties.color,
        border: `${properties.borderWidth}px solid ${properties.borderColor}`,
        borderRadius: radius,
        zIndex: properties.zIndex,
        margin: 0,
      }}
    />
  )
}
