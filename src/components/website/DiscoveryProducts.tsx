"use client";

import { shuffleDiscoveryProducts } from "@/lib/utils";
import { ProductCard } from "./ProductCard";
import { useMemo } from "react";

type ProductWithUpsellType = Omit<ProductType, "upsell"> & {
  upsell: {
    id: string;
    mainImage: string;
    pricing: {
      salePrice: number;
      basePrice: number;
      discountPercentage: number;
    };
    visibility: "DRAFT" | "PUBLISHED" | "HIDDEN";
    createdAt: string;
    updatedAt: string;
    products: {
      id: string;
      name: string;
      slug: string;
      mainImage: string;
      basePrice: number;
      options: {
        colors: Array<{
          name: string;
          image: string;
        }>;
        sizes: {
          inches: {
            columns: Array<{ label: string; order: number }>;
            rows: Array<{ [key: string]: string }>;
          };
          centimeters: {
            columns: Array<{ label: string; order: number }>;
            rows: Array<{ [key: string]: string }>;
          };
        };
      };
    }[];
  };
};

export function DiscoveryProducts({
  heading = "Explore Your Interests",
  products,
}: {
  heading?: string;
  products: ProductWithUpsellType[];
}) {
  const shuffledProducts = useMemo(
    () => shuffleDiscoveryProducts(products),
    [products]
  );

  return (
    <div>
      <h2 className="w-[calc(100%-40px)] mx-auto mb-4 font-semibold line-clamp-3 md:text-[1.375rem] md:leading-7">
        {heading}
      </h2>
      <div className="select-none w-full flex flex-wrap gap-1 md:gap-0">
        {shuffledProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
