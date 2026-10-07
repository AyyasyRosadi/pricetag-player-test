/**
 * Per-widget property types — ported from `pt-player/src/types/object.ts`.
 *
 * These describe `layout_zone_content.properties` for each widget type. The API
 * is inconsistent about whether it sends that as an object or a JSON string, so
 * every widget funnels it through `parseToJson` first.
 *
 * Same namespace-to-container transform as `types/frame.ts`; see the note there.
 */

export type TextAlignment = 'left' | 'center' | 'right' | 'justify'
export type Currency = 'Rp' | '$' | 'SAR' | '£' | '€' | ''

export interface FrameImage {
  version: number
  borderColor: string
}

export interface Text {
  version: number
  text: string
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  bgColor: string
  textAlignment: TextAlignment
  lastIndexColumn: number[]
}

export interface ItemName {
  version: number
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  bgColor: string
  textAlignment: TextAlignment
  gridPosition: number
  value: string
  binding: number
}

export interface SkuNumber {
  version: number
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  bgColor: string
  textAlignment: TextAlignment
  gridPosition: number
  value: string
  binding: number
}

export interface ItemPrice {
  version: number
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  bgColor: string
  textAlignment: TextAlignment
  gridPosition: number
  priceCut: boolean
  priceCutColor: string
  currency: Currency
  format: 'dot' | 'comma'
  binding: number
}

export interface ItemDiscount {
  version: number
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  bgColor: string
  textAlignment: TextAlignment
  gridPosition: number
  currency: Currency
  format: 'dot' | 'comma'
  binding: number
}

export interface UnitPrice {
  version: number
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  binding: number
  textAlignment: TextAlignment
  unitDisplayName: 'short' | 'normal'
  unitTextTransform: 'capitalize' | 'uppercase' | 'lowercase'
  bgColor: string
  as: 'general' | 'price' | 'discount'
}

export interface Barcode {
  version: number
  bgColor: string
  type: 'qr' | 'barcode'
  gridPosition: number
  src?: string
  binding: number
}

export interface Image {
  version: number
  fitMode: 'cover' | 'unset'
  /** for setting back to original dimension after uncheck schedule */
  originalDimension?: {
    width: number
    height: number
  }
  alias: 'none' | 'item' | 'logo' | 'discount' | 'other'
  gridPosition: number
  src?: string
  binding: number
}

export interface Video {
  version: number
  muteAudio: boolean
  duration?: number
  /** for setting back to original dimension after uncheck schedule */
  originalDimension?: {
    width: number
    height: number
  }
  gridPosition: number
  src?: string
  binding: number
}

export interface ShapeRectangle {
  version: number
  color: string
  borderColor: string
  /** "mixed" = each corner carries its own radius, anything else = one radius for all */
  borderType?: 'none' | 'mixed'
  borderWidth: number
  borderRadius: number
  borderRadiusTL?: number
  borderRadiusTR?: number
  borderRadiusBL?: number
  borderRadiusBR?: number
  zIndex: number
  gridPosition: number
  isImage: boolean
  imageFile: string
}

export interface DescriptionText {
  version: number
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  bgColor: string
  textAlignment: TextAlignment
  gridPosition: number
  value: string
  binding: number
}

export type PeriodFormat =
  | 'DD-MM-YYYY'
  | 'MM-DD-YYYY'
  | 'YYYY-MM-DD'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY/MM/DD'
  | 'DD MMMM YYYY'
  | 'MMMM DD, YYYY'
  | 'YYYY MMMM DD'
  | 'dddd, DD MMMM YYYY'

export interface PeriodItem {
  version: number
  fontColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  fontWeight: string
  bgColor: string
  textAlignment: TextAlignment
  gridPosition: number
  value: string
  binding: number
  format: PeriodFormat
}

export interface RunningText {
  version: number
  text: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontColor: string
  duration: number
  backgroundColor: string
  runFrom: 'left' | 'right'
  icon?: number | null
  icon_content_media_type?: string | null
  icon_presigned?: string
  iconWidth: number
  spaceBetween: number
  schedule_id?: number
  selectedScheduleItem?: number[]
}

/**
 * Ambient re-export under the upstream name. `declare namespace` holds only
 * types, so it emits nothing and is erasable — see `types/frame.ts`.
 */
export declare namespace LayoutObjectPropertiesTypes {
  export {
    FrameImage,
    Text,
    ItemName,
    SkuNumber,
    ItemPrice,
    ItemDiscount,
    UnitPrice,
    Barcode,
    Image,
    Video,
    ShapeRectangle,
    DescriptionText,
    PeriodItem,
    RunningText,
  }
}
