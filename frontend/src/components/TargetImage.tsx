import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TargetImageProps {
  data: any;
  imageId: string | null;
  annId: string | null;
}

export function TargetImage({ data, imageId, annId }: TargetImageProps) {
  const router = useRouter();
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
  };

  return (
    <div className="sticky top-8">
      <div className="relative inline-block w-full overflow-hidden rounded-3xl bg-white shadow-xl group leading-[0] flex flex-col">
        <img
          src={data?.target.url}
          alt="Target"
          className="w-full h-auto block m-0 p-0 relative z-0"
          onLoad={handleImageLoad}
        />

        {naturalSize.width > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="naturalRainbowGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="300" spreadMethod="repeat">
                <stop offset="0%" stopColor="#ff5e6c" stopOpacity="0.3" />
                <stop offset="20%" stopColor="#ffaa5e" stopOpacity="0.3" />
                <stop offset="40%" stopColor="#fff15e" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#5eff8b" stopOpacity="0.3" />
                <stop offset="80%" stopColor="#5ec0ff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ff5e6c" stopOpacity="0.3" />

                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  from="0,0" to="0,300"
                  dur="3s" repeatCount="indefinite"
                />
              </linearGradient>
            </defs>

            {data?.target.annotations?.map((ann: any, idx: number) => {
              if (!Array.isArray(ann.segmentation)) return null;

              const currentAnnId = ann.id?.toString();
              const isSelected = annId === currentAnnId;
              const isHovered = hoveredAnnId === currentAnnId;

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredAnnId(currentAnnId)}
                  onMouseLeave={() => setHoveredAnnId(null)}
                  onClick={() => router.push(`/search?i=${imageId}&a=${ann.id}`)}
                  className={`cursor-pointer pointer-events-auto fashion-polygon ${isSelected ? 'selected-polygon' : ''}`}
                >
                  {ann.segmentation.map((seg: number[], sIdx: number) => (
                    <polygon
                      key={sIdx}
                      points={seg.reduce((acc, val, i) => acc + (i % 2 === 0 ? val : ',' + val + ' '), '')}
                      fill={isSelected || isHovered ? "url(#naturalRainbowGradient)" : "transparent"}
                      stroke={isSelected || isHovered ? "white" : "transparent"}
                      strokeWidth="3"
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
