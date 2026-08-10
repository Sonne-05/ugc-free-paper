import { useEffect } from 'react'

// Set to true once approved to render ads on the site.
// When false, all ads, sidebar spacers, and table ad rows are completely removed from the DOM.
export const ENABLE_ADSENSE = false;

const AdSensePlaceholder = ({ format = 'horizontal', config }) => {
  const enabled = config ? config.adsenseEnabled : false

  useEffect(() => {
    if (!enabled) return
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ads might fail to load if blocked or not yet approved; fail silently
    }
  }, [enabled]);

  if (!enabled) return null;

  const pubId = config.adsensePublisherId || 'ca-pub-XXXXXXXXXXXXXXXX'
  const slotId = format === 'horizontal'
    ? (config.adsenseHorizontalSlot || 'HORIZONTAL_SLOT_ID')
    : (config.adsenseRectangleSlot || 'RECTANGLE_SLOT_ID')

  // Set sizing based on format to reserve proper layout spacing
  const style = format === 'horizontal'
    ? { display: 'block', margin: '20px auto', minHeight: '90px' }
    : { display: 'block', margin: '0 auto', minHeight: '250px' };

  return (
    <ins
      className="adsbygoogle"
      style={style}
      data-ad-client={pubId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

export default AdSensePlaceholder
