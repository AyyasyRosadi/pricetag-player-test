import BarcodeObject from '@/components/atoms/object-barcode'
import DescriptionTextObject from '@/components/atoms/object-description'
import DiscountObject from '@/components/atoms/object-discount'
import FrameImageObject from '@/components/atoms/object-frame-image'
import ImageObject from '@/components/atoms/object-image'
import ItemNameObject from '@/components/atoms/object-item-name'
import ItemPeriodObject from '@/components/atoms/object-period-item'
import PriceObject from '@/components/atoms/object-price'
import RunningTextObject from '@/components/atoms/object-running-text'
import ShapeRectangleObject from '@/components/atoms/object-shape-rectangle'
import SkuObject from '@/components/atoms/object-sku'
import TextObject from '@/components/atoms/object-text'
import UnitPriceObject from '@/components/atoms/object-unit'
import VideoObject from '@/components/atoms/object-video'
import { LayoutFrameConstants } from '@/constants/object'
import type { LayoutFrameTypes } from '@/types/frame'
import type { ItemsTypes } from '@/types/items'
import type { PlayerContent } from '@/types/player-content'

/**
 * Widget dispatcher — ported from
 * `pt-player/src/page/content/components/wrapper.tsx`.
 *
 * Positions one widget absolutely inside the frame (design pixels) and picks the
 * renderer from `layout_zone_content.content_type`.
 *
 * Upstream also renders a `frame_image` case here; it is kept, though the frame
 * renderer draws that zone itself (see `pages/content/index.tsx`) with an extra
 * stacking wrapper, which is why the frame image ends up behind everything.
 */
const ObjectWrapper = ({
  data,
  value,
  video,
  descriptionText,
  hasDiscountWidget,
}: {
  data: LayoutFrameTypes.LayoutZone
  value: ItemsTypes.ItemsContent
  video?: PlayerContent.VideoDetails[]
  descriptionText?: string
  hasDiscountWidget?: boolean
}) => {
  const renderObject = () => {
    switch (data.layout_zone_content?.content_type) {
      case LayoutFrameConstants.ContentType.FRAME_IMAGE:
        return <FrameImageObject data={data} useBorder={false} />
      case LayoutFrameConstants.ContentType.TEXT:
        return <TextObject data={data} />
      case LayoutFrameConstants.ContentType.IMAGE:
        return <ImageObject data={data} value={value} />
      case LayoutFrameConstants.ContentType.VIDEO:
        return <VideoObject data={data} value={video} />
      case LayoutFrameConstants.ContentType.SHAPE_RECTANGLE:
        return <ShapeRectangleObject data={data} />
      case LayoutFrameConstants.ContentType.BARCODE:
        return <BarcodeObject data={data} value={value} />
      case LayoutFrameConstants.ContentType.DISCOUNT_PRICE:
        return <DiscountObject data={data} value={value} />
      case LayoutFrameConstants.ContentType.ITEM_NAME:
        return <ItemNameObject data={data} value={value} />
      case LayoutFrameConstants.ContentType.ITEM_PRICE:
        return (
          <PriceObject
            data={data}
            value={value}
            hasDiscountWidget={hasDiscountWidget}
          />
        )
      case LayoutFrameConstants.ContentType.SKU_NUMBER:
        return <SkuObject data={data} value={value} />
      case LayoutFrameConstants.ContentType.UNIT_PRICE:
        return <UnitPriceObject data={data} value={value} />
      case LayoutFrameConstants.ContentType.PERIOD_ITEM:
        return <ItemPeriodObject data={data} value={value} />
      case LayoutFrameConstants.ContentType.DESCRIPTION_TEXT:
        return <DescriptionTextObject data={data} value={descriptionText ?? ''} />
      case LayoutFrameConstants.ContentType.RUNNING_TEXT:
        return <RunningTextObject data={data} />
      default:
        return null
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        height: data.height,
        width: data.width,
        left: data.position_x,
        top: data.position_y,
        zIndex: data.position_z,
        border: 'none',
      }}
    >
      {renderObject()}
    </div>
  )
}

export default ObjectWrapper
