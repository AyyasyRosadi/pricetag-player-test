/**
 * Item types — ported from `pt-player/src/types/items.ts`.
 *
 * Same namespace-to-container transform as `types/frame.ts`; see the note there.
 */
import type { PlayerContent } from './player-content'

export interface Items {
  id?: number
  photo: string
  image: string
  video_path?: string
  video?: string
  code: string
  name: string
  price: number
  discount_price: number
  unit: string
  barcode_id: string
  location_id: string
  unit_display?: number | string | null
  quantity_display?: string | number | null
  priceDisplay?: number | null
  normalPriceDisplay?: number | null
  special_price_start?: string
  special_price_end?: string
}

export interface ItemPreview {
  item_name: string
  sku_number: string
  real_price: number
  real_unit: string | number
  item_price: number
  discount_price: number
  barcode: string
  image: string
  video?: string
  video_path?: string
  unit: string | number | null
  quantity?: number | string | null
  special_price_end?: string
}

export interface ItemsContent {
  item_name: string
  sku_number: string
  item_price: string
  discount_price: string
  unit_price: string
  unit_price_discount: string
  unit_price_general: string
  qr: string
  barcode: string
  /**
   * The API is inconsistent here: fresh payloads carry `{ path, presignedUrl }`,
   * the bundled dummy data carries a bare URL string. `ObjectWrapper` passes a
   * normalised object through, so the widgets only ever see the object shape.
   */
  item_image: PlayerContent.ImageDetails | string
  period_item: string
  /** Time-boxed overrides for this item; outside every window the fields above win. */
  scheduled_price?: ScheduledPrice[]
}

/**
 * A snapshot of an item that only applies between `date_start` and `date_end`.
 * Every field is optional — whatever is missing falls back to the default item.
 */
export interface ScheduledPrice
  extends Partial<Omit<ItemsContent, 'item_image' | 'scheduled_price'>> {
  /** the API sends the image here as a plain presigned URL */
  item_image?: PlayerContent.ImageDetails | string | null
  /** absolute ISO timestamps, inclusive start / exclusive end */
  date_start?: string | null
  date_end?: string | null
}

/**
 * Ambient re-export under the upstream name. `declare namespace` holds only
 * types, so it emits nothing and is erasable — see `types/frame.ts`.
 */
export declare namespace ItemsTypes {
  export { Items, ItemPreview, ItemsContent, ScheduledPrice }
}
