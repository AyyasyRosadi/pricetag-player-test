import './index.css'

/*
 * Media smoke test — renders an image and a video side by side.
 *
 * These are the remote URLs supplied for the test. Two caveats before this
 * ships (see rules.md §5):
 *   - the 2017 TV browsers are frequently offline, and hotlinking may be
 *     blocked by referrer checks, so download both files into `public/` and
 *     reference them with relative paths;
 *   - `muted` is what lets `autoPlay` work, both on modern Chrome and on the
 *     TVs, where the D-pad cannot be used to start playback before the first
 *     paint.
 */
const TEST_IMAGE_URL =
  'https://plus.unsplash.com/premium_photo-1682130336901-10452a5dd5f4?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'

const TEST_VIDEO_URL =
  'https://media.istockphoto.com/id/1411805503/id/video/kota-pintar-teknologi-jaringan-holografik.mp4?s=mp4-640x640-is&k=20&c=uJ-t-57ber0-4eay4Mxtj8jMYnz2btMsuPQzEYbRWEA='

function Home() {
  return (
    <section className="home">
      <h1 className="home__title">Media smoke test</h1>
      <p className="home__hint">
        Image and video, side by side. On a TV, use the D-pad to focus the video
        and press OK/Enter to open the player controls.
      </p>

      <div className="media-row">
        <div className="media-row__panel">
          <img
            className="media-row__media"
            src={TEST_IMAGE_URL}
            alt="Test image"
          />
        </div>

        <div className="media-row__panel">
          <video
            className="media-row__media"
            src={TEST_VIDEO_URL}
            controls
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
          />
        </div>
      </div>
    </section>
  )
}

export default Home
