import { useEffect } from 'react'

const AdSensePlaceholder = ({ format = 'horizontal' }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ads might fail to load if blocked or not yet approved; fail silently
    }
  }, []);

  // Set sizing based on format to reserve proper layout spacing
  const style = format === 'horizontal'
    ? { display: 'block', margin: '20px auto', minHeight: '90px' }
    : { display: 'block', margin: '0 auto', minHeight: '250px' };

  return (
    <ins
      className="adsbygoogle"
      style={style}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your approved AdSense Publisher ID
      data-ad-slot={format === 'horizontal' ? 'HORIZONTAL_SLOT_ID' : 'RECTANGLE_SLOT_ID'} // Replace with your approved Ad Unit Slot IDs
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

export default AdSensePlaceholder
