/**
 * Frame content types — merged from `pt-player`'s `src/const/object.ts` and
 * `src/const/layoutFrame.ts`.
 *
 * `pt-player` declares this as `export namespace LayoutFrameConstants`, which
 * `erasableSyntaxOnly` forbids here. A namespace holding only values is just an
 * object, so it becomes a plain `const` and every `LayoutFrameConstants.X`
 * access site is unchanged.
 *
 * The two upstream copies had drifted: `const/object.ts` was missing
 * `RUNNING_TEXT` while `layoutFrame.ts` had it, and `ObjectWrapper` switches on
 * it. The superset is used here so the running-text widget is actually
 * reachable.
 */
export const LayoutFrameConstants = {
  ContentType: {
    EMPTY: 'empty',
    FRAME: 'frame',
    FRAME_IMAGE: 'frame_image',
    INSERT: 'insert',
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    SHAPE_RECTANGLE: 'shape_rectangle',
    ITEM_NAME: 'item_name',
    SKU_NUMBER: 'sku_number',
    ITEM_PRICE: 'item_price',
    DISCOUNT_PRICE: 'discount_price',
    BARCODE: 'barcode',
    ITEM_IMAGE: 'item_image',
    OTHER_IMAGE: 'other_image',
    UNIT_PRICE: 'unit_price',
    DESCRIPTION_TEXT: 'description_text',
    PERIOD_ITEM: 'period_item',
    RUNNING_TEXT: 'running_text',
    // add new content type here
  },

  DefaultLayoutRatio: {
    id: 2,
    name: '1920 x 1080 (Full HD)',
    width: 1920,
    height: 1080,
    orientation: 0,
  },
} as const
