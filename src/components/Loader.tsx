import { useEffect, useState } from 'react';

interface LoaderProps {
  /**
   * Only show loader if loading exceeds this time in ms.
   * Defaults to 250ms so fast networks never see a jarring loader flash.
   */
  delayMs?: number;
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export default function Loader({
  delayMs = 250,
  message,
  className = '',
  fullScreen = false,
}: LoaderProps) {
  const [show, setShow] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  // If request completes fast (< delayMs), do not flash the loader
  if (!show) return null;

  const content = (
    <div className={`flex flex-col items-center justify-center p-8 transition-opacity duration-300 ${className}`}>
      <span className="tjasf-loader" />
      {message && (
        <p className="text-xs font-semibold text-[#667082] mt-4 tracking-wider uppercase animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center w-full">
        {content}
      </div>
    );
  }

  return content;
}
