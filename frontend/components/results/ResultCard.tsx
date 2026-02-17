import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface ResultCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ResultCard({ title, children, className, delay = 0 }: ResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (!cardRef.current) return;

    const cardEl = cardRef.current.querySelector("[data-result-card]") as HTMLElement | null;
    const tween = gsap.fromTo(
      cardRef.current,
      { y: 18, opacity: 0, filter: "blur(4px)" },
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.55,
        delay,
        ease: "power2.out",
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 88%",
          once: true,
        },
      }
    );

    const onEnter = () => {
      if (!cardEl) return;
      gsap.to(cardEl, { y: -4, duration: 0.25, ease: "power2.out" });
    };
    const onLeave = () => {
      if (!cardEl) return;
      gsap.to(cardEl, { y: 0, duration: 0.3, ease: "power2.out" });
    };

    if (cardEl) {
      cardEl.addEventListener("mouseenter", onEnter);
      cardEl.addEventListener("mouseleave", onLeave);
    }

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      if (cardEl) {
        cardEl.removeEventListener("mouseenter", onEnter);
        cardEl.removeEventListener("mouseleave", onLeave);
      }
    };
  }, { scope: cardRef });

  return (
    <div ref={cardRef} className="opacity-0">
      <Card data-result-card className={cn("border-l-4 border-l-primary bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading tracking-wider text-primary/80 uppercase font-bold flex items-center gap-2">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
