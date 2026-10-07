import type { LayoutFrameTypes } from '@/types/frame'

/**
 * Frame-image widget — ported from
 * `pt-player/src/components/atoms/object-image copy/{index,v1}.tsx`.
 *
 * Upstream folder is literally named `object-image copy`; renamed here to
 * `object-frame-image` (a space in a module path is a portability hazard, and
 * the name never appears in payloads — it is addressed by content type
 * `frame_image`).
 *
 * It is a plain white backdrop behind the rest of the frame. `useBorder` is
 * false on the player path, so the border is always `0` there; the prop is kept
 * because the CMS editor needs it.
 */
export default function FrameImageObject({
  active,
  useBorder = true,
}: LayoutFrameTypes.ObjectProps & { active?: boolean; useBorder?: boolean }) {
  return (
    <div
      id="frame-wrap"
      style={{
        width: '100%',
        height: '100%',
        border: useBorder
          ? active
            ? '1px solid #6a329f'
            : '1px solid #d8d8d8'
          : '0px solid #ffffff',
        backgroundColor: '#FFFFFF',
        margin: 0,
      }}
    />
  )
}
