/**
 * Player content types — ported from `pt-player/src/types/player-content.ts`,
 * plus the schedule/types the renderer needs.
 *
 * This is the shape of `GET /player-render/content/getPlayerContent` and of the
 * bundled `constants/dummy.ts`.
 *
 * Same namespace-to-container transform as `types/frame.ts`; see the note there.
 * (`TPlayerContent` was the earlier loose placeholder — it is gone, use
 * `PlayerContent.PlayerContentData`.)
 */
import type { LayoutFrameTypes } from './frame'
import type { ItemsTypes } from './items'

/**
 * Mirrors the `recurrence` field emitted by the CMS schedule builder:
 * 0 = one time only (plain start/end range)
 * 1 = every day inside the range, limited to `properties.times`
 * 2 = specific weekdays, each carrying its own time window in `properties.days`
 * 3 = specific weekdays sharing one time window in `properties.times`
 */
export type ScheduleRecurrence = 0 | 1 | 2 | 3

export interface ScheduleDay {
  /** 0 = Sunday … 6 = Saturday */
  day: number
  /** "HH:mm" / "HH:mm:ss", read against the device clock */
  start: string
  end: string
}

export interface ScheduleProperties {
  days?: ScheduleDay[] | null
  times?: { start: string; end: string } | null
}

export interface FontWidgets {
  fontFamily: string
  fontWeight: string
}

export interface VideoDetails {
  VideoName: string
  VideoNo: number
  VideoUrl: string
  VideoPath: string
}

export interface ImageDetails {
  path: string
  presignedUrl: string
}

export interface ContentPlayer {
  deviceCode: string
  layoutTemplateHtml?: string
  mappingItems: ItemsTypes.ItemsContent[]
  logoImages: ImageDetails[]
  otherImages: ImageDetails[]
  discountImages: ImageDetails[]
  fontsInWidget: FontWidgets[]
  widgetDescriptions: string[]
  frameImageWidth: number
  frameImageHeight: number
  videoX: number
  videoY: number
  videoHeight: number
  videoWidth: number
  videoDetails: VideoDetails[]
  /** only older payloads embed the layout; newer ones carry `layoutId` instead */
  layout?: LayoutFrameTypes.LayoutData
  /** looked up in `PlayerContentData.displayLayouts` */
  layoutId?: number | string | null
  scheduleStart?: Date | string | null
  scheduleEnd?: Date | string | null
  sequence?: number
  duration?: number
  /** Absent means the item is a plain start/end range (recurrence 0). */
  recurrence?: ScheduleRecurrence
  properties?: ScheduleProperties | null
}

export interface PlayerContentData {
  layout: LayoutFrameTypes.LayoutData
  /** promo variant of `layout`, shown while the default content is discounted */
  layoutAlt?: LayoutFrameTypes.LayoutData | null
  /** pool the scheduled items point into with their `layoutId` */
  displayLayouts?: LayoutFrameTypes.LayoutData[] | null
  displayItems: ContentPlayer
  displayItemsWithSchedules?: ContentPlayer[]
  media?: {
    file_path: string
  }
  location: string
  orientation?: number
  content_type?: number
}

/**
 * Ambient re-export under the upstream name. `declare namespace` holds only
 * types, so it emits nothing and is erasable — see `types/frame.ts`.
 */
export declare namespace PlayerContent {
  export {
    ScheduleRecurrence,
    ScheduleDay,
    ScheduleProperties,
    FontWidgets,
    VideoDetails,
    ImageDetails,
    ContentPlayer,
    PlayerContentData,
  }
}
