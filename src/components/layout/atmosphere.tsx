import { PointerParticles } from "@/components/layout/pointer-particles";
import { useAtmosphereParallax } from "@/lib/use-pointer-orbit";

export function Atmosphere() {
  const imageRef = useAtmosphereParallax<HTMLImageElement>(16);

  return (
    <>
      <div className="atmosphere" aria-hidden="true">
        <picture>
          <source
            media="(max-width: 767px)"
            type="image/webp"
            srcSet="/atmosphere/flower-mobile.webp"
          />
          <source media="(max-width: 767px)" srcSet="/atmosphere/flower-mobile.jpg" />
          <source type="image/webp" srcSet="/atmosphere/flower.webp" />
          <img
            ref={imageRef}
            src="/atmosphere/flower.jpg"
            alt=""
            className="atmosphere-image"
            width={1200}
            height={1500}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="atmosphere-veil" />
      </div>
      <PointerParticles />
    </>
  );
}
