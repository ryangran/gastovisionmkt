import { cn } from "@/lib/utils";
import shopeeLogo from "@/assets/shopee-logo.png";
import mercadolivreLogo from "@/assets/mercadolivre-logo.png";
import amazonLogo from "@/assets/amazon-logo.png";
import amazonLogoDark from "@/assets/amazon-logo-dark.png";
import magaluLogo from "@/assets/magalu-logo.png";
import magaluLogoDark from "@/assets/magalu-logo-dark.png";
import tiktokLogo from "@/assets/tiktok-logo.png";
import tiktokLogoDark from "@/assets/tiktok-logo-dark.png";
import sheinLogo from "@/assets/shein-logo.png";
import sheinLogoDark from "@/assets/shein-logo-dark.png";

export type MarketplaceKey =
  | "shopee"
  | "mercadolivre"
  | "amazon"
  | "magalu"
  | "tiktok"
  | "shein";

/**
 * Shopee e Mercado Livre têm arte clara o bastante para os dois temas.
 * Amazon, Magalu, TikTok e Shein são desenhados para fundo branco (wordmark
 * preto ou azul-marinho) e sumiriam no fundo preto do tema escuro, então
 * ganham uma variante clareada que preserva as cores de marca.
 */
const LOGOS: Record<MarketplaceKey, { label: string; light: string; dark: string }> = {
  shopee: { label: "Shopee", light: shopeeLogo, dark: shopeeLogo },
  mercadolivre: { label: "Mercado Livre", light: mercadolivreLogo, dark: mercadolivreLogo },
  amazon: { label: "Amazon", light: amazonLogo, dark: amazonLogoDark },
  magalu: { label: "Magalu", light: magaluLogo, dark: magaluLogoDark },
  tiktok: { label: "TikTok", light: tiktokLogo, dark: tiktokLogoDark },
  shein: { label: "Shein", light: sheinLogo, dark: sheinLogoDark },
};

interface MarketplaceLogoProps {
  platform: MarketplaceKey;
  /** Classes de tamanho, ex.: "h-4 w-auto max-w-16". */
  className?: string;
  alt?: string;
}

export const MarketplaceLogo = ({ platform, className, alt }: MarketplaceLogoProps) => {
  const { label, light, dark } = LOGOS[platform];
  const base = cn("object-contain shrink-0", className);
  const label_ = alt ?? label;

  return (
    <>
      <img src={dark} alt={label_} className={cn(base, "hidden dark:block")} />
      <img src={light} alt={label_} className={cn(base, "block dark:hidden")} />
    </>
  );
};
