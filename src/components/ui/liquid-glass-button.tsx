import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const liquidGlassButtonVariants = cva(
  "group/lgb relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-sans font-medium backdrop-blur-md transition-[background-color,box-shadow,transform,color] duration-300 ease-out will-change-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Vidro translúcido sobre fundo escuro (herói)
        glass:
          "bg-white/10 text-white shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.28),inset_0_-1px_0_0_hsl(0_0%_100%/0.06),0_10px_28px_-14px_hsl(0_0%_0%/0.65)] ring-1 ring-inset ring-white/15 hover:bg-white/[0.14] hover:ring-white/25 hover:shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.4),0_16px_44px_-16px_hsl(var(--primary)/0.75)]",
        // Pílula branca sólida (CTA da barra de navegação)
        solid:
          "bg-white/95 text-neutral-900 shadow-[inset_0_1px_0_0_hsl(0_0%_100%),0_8px_22px_-12px_hsl(0_0%_0%/0.55)] ring-1 ring-inset ring-white/70 hover:bg-white hover:shadow-[inset_0_1px_0_0_hsl(0_0%_100%),0_14px_38px_-14px_hsl(var(--primary)/0.8)]",
        // Só texto, ganha o vidro no hover
        ghost:
          "bg-transparent text-white/90 ring-1 ring-inset ring-transparent hover:bg-white/[0.06] hover:text-white hover:ring-white/15",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        default: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "glass",
      size: "default",
    },
  },
);

export interface LiquidGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidGlassButtonVariants> {
  /** Renderiza como `<a>` quando informado. */
  href?: string;
  target?: string;
  rel?: string;
}

/**
 * Botão de vidro líquido com fumaça vermelha que sobe por dentro no hover.
 * A fumaça é feita de três manchas borradas em `hsl(var(--primary))`, recortadas
 * pelo `overflow-hidden` do botão, mais um brilho que segue o cursor.
 */
const LiquidGlassButton = React.forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  ({ className, variant = "glass", size, href, children, onPointerMove, ...props }, ref) => {
    const localRef = React.useRef<HTMLButtonElement | null>(null);

    const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
      const el = localRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--lgb-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty("--lgb-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }
      onPointerMove?.(event);
    };

    // Sobre branco a fumaça precisa pesar menos e não pode clarear o fundo.
    const smokeTone =
      variant === "solid"
        ? "opacity-0 mix-blend-multiply group-hover/lgb:opacity-60"
        : "opacity-0 mix-blend-screen group-hover/lgb:opacity-100";

    const Comp = (href ? "a" : "button") as React.ElementType;

    return (
      <Comp
        ref={(node: HTMLButtonElement | null) => {
          localRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        href={href}
        onPointerMove={handlePointerMove}
        className={cn(liquidGlassButtonVariants({ variant, size }), className)}
        {...props}
      >
        {/* Fumaça vermelha */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500 ease-out",
            smokeTone,
          )}
        >
          <span className="absolute -left-[15%] -top-[100%] h-[300%] w-[55%] animate-lgb-smoke-a rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.95),hsl(var(--primary)/0.45)_55%,transparent)] blur-[16px]" />
          <span className="absolute left-[25%] -top-[110%] h-[320%] w-[50%] animate-lgb-smoke-b rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.85),hsl(var(--primary)/0.35)_58%,transparent)] blur-[18px]" />
          <span className="absolute left-[58%] -top-[95%] h-[290%] w-[52%] animate-lgb-smoke-c rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.9),hsl(var(--primary)/0.4)_56%,transparent)] blur-[15px]" />
        </span>

        {/* Brilho que segue o cursor */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/lgb:opacity-100",
            variant === "solid" ? "mix-blend-multiply" : "mix-blend-screen",
          )}
          style={{
            background:
              "radial-gradient(120px circle at var(--lgb-x, 50%) var(--lgb-y, 50%), hsl(var(--primary) / 0.55), transparent 70%)",
          }}
        />

        {/* Reflexo de vidro varrendo no hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover/lgb:animate-lgb-sheen group-hover/lgb:opacity-100"
        />

        {/* Realce especular no topo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
        />

        {children}
      </Comp>
    );
  },
);
LiquidGlassButton.displayName = "LiquidGlassButton";

export { LiquidGlassButton, liquidGlassButtonVariants };
