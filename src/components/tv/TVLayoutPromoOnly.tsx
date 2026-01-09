import { PromoSlider } from './PromoSlider';

interface TVLayoutPromoOnlyProps {
  sliderInterval: number;
  screenConfigId?: string;
}

export function TVLayoutPromoOnly({ sliderInterval, screenConfigId }: TVLayoutPromoOnlyProps) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden">
      <PromoSlider 
        interval={sliderInterval} 
        className="w-full h-full"
        screenConfigId={screenConfigId}
      />
    </div>
  );
}
