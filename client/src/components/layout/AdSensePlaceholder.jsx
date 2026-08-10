import './AdSensePlaceholder.css'

// Toggle this flag to true once AdSense is approved to show the ads
const SHOW_ADS = false;

const AdSensePlaceholder = ({ type = 'display', format = 'horizontal' }) => {
  if (!SHOW_ADS) return null;

  const getDimensionsText = () => {
    if (format === 'horizontal') return 'Responsive Leaderboard (728 × 90)'
    if (format === 'vertical') return 'Wide Skyscraper (160 × 600)'
    return 'Medium Rectangle (300 × 250)'
  }

  return (
    <div className={`ad-placeholder ad-placeholder--${type} ad-placeholder--${format}`}>
      <span className="ad-placeholder__label">Sponsored</span>
      <div className="ad-placeholder__content">
        <span className="ad-placeholder__logo">AdSense</span>
        <span className="ad-placeholder__dimensions">
          {getDimensionsText()}
        </span>
      </div>
    </div>
  )
}

export default AdSensePlaceholder
