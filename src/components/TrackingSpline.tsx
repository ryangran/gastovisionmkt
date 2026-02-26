import { SplineScene } from '@/components/ui/splite';

interface TrackingSplineProps {
  scene: string;
  className?: string;
}

export function TrackingSpline({ scene, className }: TrackingSplineProps) {
  return (
    <div className={className}>
      <SplineScene scene={scene} className="w-full h-full" />
    </div>
  );
}
