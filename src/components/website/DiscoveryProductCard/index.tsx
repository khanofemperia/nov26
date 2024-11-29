"use client";

import { QuickviewButton } from "@/components/website/QuickviewOverlay";
import { formatThousands } from "@/lib/utils/common";
import Image from "next/image";
import Link from "next/link";
import styles from "./styles.module.css";

export function DiscoveryProductCard({
  product,
  cart,
  deviceIdentifier,
}: {
  product: ProductWithUpsellType;
  cart: CartType | null;
  deviceIdentifier: string;
}) {
  return (
    <div className={styles.productCard}>
      <Link
        href={`/${product.slug}-${product.id}`}
        className="w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden bg-white"
      >
        <Image
          src={product.images.main}
          alt={product.name}
          width={1000}
          height={1000}
          priority={true}
        />
      </Link>
      <div className="pt-2 flex flex-col gap-[6px]">
        <p className="text-xs line-clamp-1">{product.name}</p>
        <div className="flex items-center justify-between w-full">
          <div className="w-max flex items-center justify-center">
            {Number(product.pricing.salePrice) ? (
              <div className="flex items-center gap-[6px]">
                <div className="flex items-baseline text-[rgb(168,100,0)]">
                  <span className="text-[0.813rem] leading-3 font-semibold">
                    $
                  </span>
                  <span className="text-lg font-bold">
                    {Math.floor(Number(product.pricing.salePrice))}
                  </span>
                  <span className="text-[0.813rem] leading-3 font-semibold">
                    {(Number(product.pricing.salePrice) % 1)
                      .toFixed(2)
                      .substring(1)}
                  </span>
                </div>
                <span className="text-[0.813rem] leading-3 text-gray line-through">
                  ${formatThousands(Number(product.pricing.basePrice))}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline">
                <span className="text-[0.813rem] leading-3 font-semibold">
                  $
                </span>
                <span className="text-lg font-bold">
                  {Math.floor(Number(product.pricing.basePrice))}
                </span>
                <span className="text-[0.813rem] leading-3 font-semibold">
                  {(Number(product.pricing.basePrice) % 1)
                    .toFixed(2)
                    .substring(1)}
                </span>
              </div>
            )}
          </div>
          <QuickviewButton
            onClick={(event) => event.stopPropagation()}
            product={product}
            cart={cart}
            deviceIdentifier={deviceIdentifier}
          />
        </div>
      </div>
    </div>
  );
}
