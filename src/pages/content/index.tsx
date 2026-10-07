import { memo } from 'react'
import MyFrame from '@/components/molecules/my-frame'
import { LayoutFrameConstants } from '@/constants/object'
import type { LayoutFrameTypes } from '@/types/frame'
import type { PlayerContent } from '@/types/player-content'
import { parseToJson } from '@/utils/parseToJson'
import ObjectWrapper from './components/wrapper'

// `FrameContext` lives in `./frame-context.ts`; exporting a context from this
// file would break Fast Refresh (`only-export-components`).

/** The only two `properties` fields the renderer itself needs to read. */
type ZoneProperties = { binding?: number; alias?: string }

const propsOf = (zone: LayoutFrameTypes.LayoutZone): ZoneProperties =>
  parseToJson<ZoneProperties>(zone.layout_zone_content.properties)

/**
 * Frame renderer — ported from `pt-player/src/page/content/index.tsx`.
 *
 * Turns a `PlayerContentData` payload into absolutely-positioned widgets inside
 * `MyFrame`. Three deliberate differences from upstream:
 *
 *   1. Upstream pulls `?fromAndroid=true` off the URL with Next's
 *      `useSearchParams` and stores it in `isFromAndroid`, which is then never
 *      read. Both are dropped.
 *   2. Upstream wraps the component in `memo` with a custom `deepEqual`
 *      comparator; the default shallow comparison is used instead.
 *   3. `rotationDegree` / `setIsNeedToRotate` were props from the socket hook.
 *      Screen rotation is not ported, so they are gone; the frame renders at the
 *      layout's own dimensions and the canvas handles fitting.
 *
 * `binding` is read through `parseToJson` rather than by indexing
 * `properties.binding` directly, because the API sends that field as either an
 * object or a JSON string and this project's tsconfig has no room for `any`.
 */
const Frame = ({ layout, displayItems }: PlayerContent.PlayerContentData) => {
  const zones = layout?.layout_zone ?? []

  const videoObjects = zones.filter(
    (zone) =>
      zone.layout_zone_content?.content_type ===
      LayoutFrameConstants.ContentType.VIDEO,
  )
  const contentObjects = zones.filter(
    (zone) =>
      zone.layout_zone_content?.content_type !==
      LayoutFrameConstants.ContentType.VIDEO,
  )
  const frame = zones.find(
    (zone) =>
      zone.layout_zone_content?.content_type ===
      LayoutFrameConstants.ContentType.FRAME_IMAGE,
  )

  // bindings that own a discount widget — the price widget hides itself on those
  // when the discount is 0, because the discount widget renders the normal price
  const discountBindings = new Set(
    zones
      .filter(
        (zone) =>
          zone.layout_zone_content?.content_type ===
          LayoutFrameConstants.ContentType.DISCOUNT_PRICE,
      )
      .map((zone) => Number(propsOf(zone).binding)),
  )

  const mappingItems = displayItems?.mappingItems ?? []

  return (
    <MyFrame
      frameWidth={layout?.additional_configuration?.width ?? 1920}
      frameHeight={layout?.additional_configuration?.height ?? 1080}
    >
      {videoObjects
        .slice()
        .sort((a, b) => a.position_z - b.position_z)
        .map((object, index) => (
          <ObjectWrapper
            key={`video-${index}`}
            data={object}
            value={mappingItems[index]}
            video={displayItems.videoDetails}
          />
        ))}

      <div
        style={{
          position: 'absolute',
          left: frame?.position_x,
          top: frame?.position_y,
          width: frame?.width,
          height: frame?.height,
        }}
      >
        {contentObjects.map((zone, index) => {
          const content = zone.layout_zone_content
          const { binding = 0, alias } = propsOf(zone)

          if (content.content_type === LayoutFrameConstants.ContentType.IMAGE) {
            const image =
              alias === 'logo'
                ? displayItems.logoImages[binding - 1]
                : alias === 'discount'
                  ? displayItems.discountImages[binding - 1]
                  : alias === 'other'
                    ? displayItems.otherImages[binding - 1]
                    : mappingItems[binding - 1]?.item_image

            return (
              <ObjectWrapper
                key={`content-${index}`}
                data={zone}
                value={{
                  ...mappingItems[binding - 1],
                  item_image: image,
                }}
              />
            )
          }

          return (
            <ObjectWrapper
              key={`content-${index}`}
              data={zone}
              value={mappingItems[binding - 1]}
              descriptionText={displayItems.widgetDescriptions?.[binding - 1]}
              hasDiscountWidget={discountBindings.has(binding)}
            />
          )
        })}
      </div>
    </MyFrame>
  )
}

export default memo(Frame)
