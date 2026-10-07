/**
 * Layout/frame types — ported from `pt-player/src/types/frame.ts`.
 *
 * `pt-player` declares these inside a real `export namespace LayoutFrameTypes`,
 * which `erasableSyntaxOnly` forbids here (a namespace emits runtime code, so it
 * is not erasable). The members are declared as plain interfaces below and
 * re-exposed through `LayoutFrameTypes`, a type-only container. Every
 * `LayoutFrameTypes.LayoutZone` reference in the ported widgets therefore stays
 * character-for-character identical to upstream.
 */

export interface LayoutRatio {
  id?: number
}

export interface LayoutZoneContentMedia {
  id: number
  title: string
  type: number
  presignedUrl: string
  file_path?: string
  duration?: number
}

export interface LayoutZoneContent {
  id?: string
  content_type: string
  /** JSON string on some payloads, an object on others — see `parseToJson`. */
  properties: unknown
  content_id?: number
  media?: LayoutZoneContentMedia
}

export interface LayoutZone {
  id?: number
  position_x: number
  position_y: number
  position_z: number
  width: number
  height: number
  layout_zone_content: LayoutZoneContent
}

export type ScreenRotationOptions = '90clock' | '90anticlock'

export interface LayoutData {
  id: number | string | null
  name: string
  description: string
  layout_ratio?: null
  layout_zone: LayoutZone[]
  presignedUrl?: string
  image_path?: string
  mapped_display?: string[]
  tenantId?: number
  additional_configuration: {
    type: string
    availableColors: string[]
    ratio_name: string
    version: number
    screen_rotation: string
    orientation: number
    width: number
    height: number
    total_items: number
  } | null
  createdAt?: Date
  updatedAt?: Date
}

export interface ObjectProps {
  data: LayoutZone
}

/**
 * Ambient re-export of the interfaces above under the upstream name.
 *
 * `declare namespace` holds only types, so it emits nothing and is erasable —
 * unlike a real `namespace`, which `erasableSyntaxOnly` rejects. Keeping it
 * means every `LayoutFrameTypes.LayoutZone` reference in the ported widgets
 * stays character-for-character identical to `pt-player`.
 */
export declare namespace LayoutFrameTypes {
  export {
    LayoutRatio,
    LayoutZoneContentMedia,
    LayoutZoneContent,
    LayoutZone,
    LayoutData,
    ObjectProps,
    ScreenRotationOptions,
  }
}
