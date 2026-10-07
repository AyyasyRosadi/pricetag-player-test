import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { LayoutObjectPropertiesTypes } from '@/types/object'
import { parseToJson } from '@/utils/parseToJson'

/**
 * Item-image widget — ported from
 * `pt-player/src/components/atoms/object-image/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * `item_image` is typed as `ImageDetails | string` because the API is not
 * consistent about it; both shapes resolve to a URL here. Upstream also carries
 * a `loading` state that is written but never read, and an unused
 * `getPlayerPresignUrl` import — both dropped.
 */
export default function ImageObject({
  data,
  value,
}: LayoutFrameTypes.ObjectProps & { value: ItemsTypes.ItemsContent }) {
  const properties = parseToJson<LayoutObjectPropertiesTypes.Image>(
    data.layout_zone_content.properties,
  )

  const image = value?.item_image
  const src = typeof image === 'string' ? image : (image?.presignedUrl ?? '')

  return (
    <img
      src={src}
      alt={properties?.alias ?? 'Placeholder'}
      style={{
        width: '100%',
        height: '100%',
        margin: 0,
      }}
      draggable="false"
    />
  )
}
