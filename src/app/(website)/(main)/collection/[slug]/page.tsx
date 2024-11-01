import { ProductCard } from "@/components/website/ProductCard";
import { QuickviewOverlay } from "@/components/website/QuickviewOverlay";
import ShowAlert from "@/components/website/ShowAlert";
import { UpsellReviewOverlay } from "@/components/website/UpsellReviewOverlay";
import { getCart } from "@/lib/api/cart";
import { getCollections } from "@/lib/api/collections";
import { cookies } from "next/headers";

export default async function Collections({
  params,
}: {
  params: { slug: string };
}) {
  const deviceIdentifier = cookies().get("device_identifier")?.value || "";
  const cart = await getCart(deviceIdentifier);

  const [collection] =
    (await getCollections({
      ids: [params.slug.split("-").pop() as string],
      includeProducts: true,
    })) || [];

  return (
    <>
      <div className="max-w-[968px] mx-auto pt-10">
        {collection?.products && (
          <div className="select-none w-full flex flex-wrap gap-1 md:gap-0">
            {collection.products.filter(Boolean).map((product, index) => (
              <ProductCard
                key={index}
                product={product as ProductWithUpsellType & { index: number }}
                cart={cart}
                deviceIdentifier={deviceIdentifier}
              />
            ))}
          </div>
        )}
      </div>
      <QuickviewOverlay />
      <UpsellReviewOverlay cart={cart} />
      <ShowAlert />
    </>
  );
}
