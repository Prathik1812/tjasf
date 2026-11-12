import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(35);

    const midTimer = setTimeout(() => {
      setProgress(75);
    }, 70);

    const endTimer = setTimeout(() => {
      setProgress(100);
    }, 200);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 400);

    return () => {
      clearTimeout(midTimer);
      clearTimeout(endTimer);
      clearTimeout(hideTimer);
    };
  }, [location.pathname, location.search]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[99999] pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-[#eb5526] via-[#ff7849] to-[#eb5526] shadow-[0_0_10px_rgba(235,85,38,0.75)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? 'none' : 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}
