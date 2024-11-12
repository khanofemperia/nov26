import { OrderConfirmedEmailPreviewButton, OrderConfirmedEmailPreviewOverlay } from "@/components/admin/OrderConfirmedEmailPreviewOverlay";
import { OrderShippedEmailPreviewButton, OrderShippedEmailPreviewOverlay } from "@/components/admin/OrderShippedEmailPreviewOverlay";
import { OrderDeliveredEmailPreviewButton, OrderDeliveredEmailPreviewOverlay } from "@/components/admin/OrderDeliveredEmailPreviewOverlay";
import { getProducts } from "@/lib/api/products";
import config from "@/lib/config";
import { database } from "@/lib/firebase";
import { capitalizeFirstLetter, formatThousands } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";

type OrderDetailsType = {
  id: string;
  intent: string;
  status: string;
  payment_source: {
    paypal: {
      email_address: string;
      account_id: string;
      account_status: string;
      name: {
        given_name: string;
        surname: string;
      };
      phone_number: {
        national_number: string;
      };
      address: {
        country_code: string;
      };
      attributes: {
        cobranded_cards: Array<{
          labels: any[];
          payee: {
            email_address: string;
            merchant_id: string;
          };
          amount: {
            currency_code: string;
            value: string;
          };
        }>;
      };
    };
  };
  purchase_units: Array<{
    reference_id: string;
    amount: {
      currency_code: string;
      value: string;
      breakdown: {
        item_total: {
          currency_code: string;
          value: string;
        };
        shipping: {
          currency_code: string;
          value: string;
        };
        handling: {
          currency_code: string;
          value: string;
        };
        insurance: {
          currency_code: string;
          value: string;
        };
        shipping_discount: {
          currency_code: string;
          value: string;
        };
        discount: {
          currency_code: string;
          value: string;
        };
      };
    };
    payee: {
      email_address: string;
      merchant_id: string;
    };
    description: string;
    soft_descriptor: string;
    items: Array<{
      name: string;
      unit_amount: {
        currency_code: string;
        value: string;
      };
      tax: {
        currency_code: string;
        value: string;
      };
      quantity: string;
      sku: string;
    }>;
    shipping: {
      name: {
        full_name: string;
      };
      address: {
        address_line_1: string;
        address_line_2: string;
        admin_area_2: string;
        admin_area_1: string;
        postal_code: string;
        country_code: string;
      };
    };
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
        final_capture: boolean;
        seller_protection: {
          status: string;
          dispute_categories: string[];
        };
        seller_receivable_breakdown: {
          gross_amount: {
            currency_code: string;
            value: string;
          };
          paypal_fee: {
            currency_code: string;
            value: string;
          };
          net_amount: {
            currency_code: string;
            value: string;
          };
        };
        links: Array<{
          href: string;
          rel: string;
          method: string;
        }>;
        create_time: string;
        update_time: string;
      }>;
    };
  }>;
  payer: {
    name: {
      given_name: string;
      surname: string;
    };
    email_address: string;
    payer_id: string;
    phone: {
      phone_number: {
        national_number: string;
      };
    };
    address: {
      country_code: string;
    };
  };
  update_time: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
};

type ProductType = {
  slug: string;
  type: "product";
  mainImage: string;
  pricing: {
    basePrice: number;
    salePrice: number;
    discountPercentage: number;
  };
  color: string;
  size: string;
  index: number;
  baseProductId: string;
  variantId: string;
  name: string;
};

type UpsellType = {
  mainImage: string;
  index: number;
  pricing: {
    basePrice: number;
    salePrice: number;
    discountPercentage: number;
  };
  products: Array<{
    mainImage: string;
    index: number;
    basePrice: number;
    color: string;
    id: string;
    size: string;
    slug: string;
    name: string;
  }>;
  type: "upsell";
  baseUpsellId: string;
  variantId: string;
};

type PaymentTransaction = {
  id: string;
  status: string;
  transactionId: string;
  timestamp: string;
  amount: {
    currency: string;
    value: string;
  };
  payer: {
    email: string;
    payerId: string;
    name: {
      firstName: string;
      lastName: string;
    };
  };
  shipping: {
    name: string;
    address: {
      line1: string;
      state: string;
      country: string;
      city: string;
      postalCode: string;
    };
  };
  items: Array<ProductType | UpsellType>;
};

const PAYPAL_BASE_URL =
  "https://www.sandbox.paypal.com/unifiedtransactions/details/payment/";

export default async function OrderDetails({
  params,
}: {
  params: { id: string };
}) {
  const response = await fetch(
    `${config.BASE_URL}/api/paypal/orders/${params.id}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Failed to fetch order details", response);
    return <div>Error fetching order details</div>;
  }

  const paypalOrder: OrderDetailsType = await response.json();
  const order = (await getOrderById(paypalOrder.id)) as PaymentTransaction;

  await updateUpsellProductNames(order);

  function formatOrderPlacedDate(order: OrderDetailsType): string {
    const dateObj = new Date(
      order.purchase_units[0].payments.captures[0].create_time
    );

    const formattedDateTime = dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const [datePart, timePart] = formattedDateTime.split(" at ");

    const timezone = dateObj
      .toLocaleTimeString("en-US", { timeZoneName: "short" })
      .split(" ")
      .pop();

    return `${datePart}, ${timePart.trim()} (${timezone})`;
  }

  function getPayPalUrl(captureId: string) {
    return `${PAYPAL_BASE_URL}${captureId}`;
  }

  const orderPlacedDate = formatOrderPlacedDate(paypalOrder);
  const captureId = paypalOrder.purchase_units[0].payments.captures[0].id;
  const paypalUrl = getPayPalUrl(captureId);

  const formatProductOptions = (color?: string, size?: string) => {
    if (!color && !size) return null;
    if (color && size) return `${color} / ${size}`;
    return color || size;
  };

  return (
    <>
      <div className="w-full max-w-[768px] flex flex-col gap-6">
        <div className="relative flex items-center justify-between shadow rounded-xl bg-white">
          <div className="w-full flex flex-col px-5">
            <div className="flex flex-col gap-2 py-5 border-b">
              <div className="flex gap-5 text-sm">
                <h3 className="min-w-[78px] max-w-[78px] text-gray">
                  Transaction
                </h3>
                <div className="px-2 rounded-full h-5 w-max flex items-center bg-green/10 border border-green/15 text-green">
                  {capitalizeFirstLetter(paypalOrder.status)}
                </div>
              </div>
              <div className="flex gap-5 text-sm">
                <h3 className="min-w-[78px] max-w-[78px] text-gray">
                  Purchased
                </h3>
                <span className="w-full font-medium">{orderPlacedDate}</span>
              </div>
              <div className="flex gap-5 text-sm">
                <h3 className="min-w-[78px] max-w-[78px] text-gray">Total</h3>
                <span className="w-full font-medium">
                  ${paypalOrder.purchase_units[0].amount.value}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 py-5 border-b">
              <div className="flex gap-5 text-sm">
                <h3 className="min-w-[78px] max-w-[78px] text-gray">
                  Shipping
                </h3>
                <div className="flex flex-col gap-2 font-medium">
                  <span>
                    {
                      paypalOrder.purchase_units[0].shipping.address
                        .address_line_1
                    }
                    ,{" "}
                    {
                      paypalOrder.purchase_units[0].shipping.address
                        .address_line_2
                    }
                  </span>
                  <span>
                    {
                      paypalOrder.purchase_units[0].shipping.address
                        .admin_area_2
                    }
                    ,{" "}
                    {
                      paypalOrder.purchase_units[0].shipping.address
                        .admin_area_1
                    }{" "}
                    {paypalOrder.purchase_units[0].shipping.address.postal_code}
                  </span>
                  <span>
                    {
                      paypalOrder.purchase_units[0].shipping.address
                        .country_code
                    }
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 py-5 border-b">
              <div className="flex gap-5 text-sm">
                <h3 className="min-w-[78px] max-w-[78px] text-gray">
                  Customer
                </h3>
                <span className="w-full font-medium">
                  {paypalOrder.payer.name.given_name}{" "}
                  {paypalOrder.payer.name.surname}
                </span>
              </div>
              <div className="flex gap-5 text-sm">
                <h3 className="min-w-[78px] max-w-[78px] text-gray">Email</h3>
                <span className="w-full font-medium">
                  {paypalOrder.payer.email_address}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 py-5">
              <div className="flex gap-5 text-sm">
                <h3 className="min-w-[78px] max-w-[78px] text-gray">ID</h3>
                <Link href={paypalUrl} target="_blank">
                  <span className="w-full text-gray text-xs underline">
                    {captureId}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 pt-4 relative shadow rounded-xl bg-white">
          <div className="flex flex-wrap gap-5">
            <OrderConfirmedEmailPreviewButton />
            <OrderShippedEmailPreviewButton />
            <OrderDeliveredEmailPreviewButton />
          </div>
        </div>
        <div className="max-w-[618px] relative flex items-center justify-between shadow rounded-xl bg-white">
          <div className="p-5 flex flex-col gap-5">
            {order.items.map((item) => {
              if (item.type === "product") {
                const productOptions = formatProductOptions(
                  item.color,
                  item.size
                );
                return (
                  <div key={item.index} className="flex gap-5">
                    <div className="min-w-32 max-w-32 min-h-32 max-h-32 overflow-hidden rounded-lg flex items-center justify-center">
                      <Image
                        src={item.mainImage}
                        alt={item.name}
                        width={128}
                        height={128}
                        priority
                      />
                    </div>
                    <div className="w-full pr-3 flex flex-col gap-1">
                      <Link
                        href={`${item.slug}-${item.baseProductId}`}
                        target="_blank"
                        className="text-xs text-gray line-clamp-1 hover:underline"
                      >
                        {item.name}
                      </Link>
                      {productOptions && (
                        <span className="mb-1 text-xs font-medium">
                          {productOptions}
                        </span>
                      )}
                      <div className="w-max flex items-center justify-center">
                        {Number(item.pricing.salePrice) ? (
                          <div className="flex items-center gap-[6px]">
                            <div className="flex items-baseline text-[rgb(168,100,0)]">
                              <span className="text-[0.813rem] leading-3 font-semibold">
                                $
                              </span>
                              <span className="text-lg font-bold">
                                {Math.floor(Number(item.pricing.salePrice))}
                              </span>
                              <span className="text-[0.813rem] leading-3 font-semibold">
                                {(Number(item.pricing.salePrice) % 1)
                                  .toFixed(2)
                                  .substring(1)}
                              </span>
                            </div>
                            <span className="text-[0.813rem] leading-3 text-gray line-through">
                              ${formatThousands(Number(item.pricing.basePrice))}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline">
                            <span className="text-[0.813rem] leading-3 font-semibold">
                              $
                            </span>
                            <span className="text-lg font-bold">
                              {Math.floor(Number(item.pricing.basePrice))}
                            </span>
                            <span className="text-[0.813rem] leading-3 font-semibold">
                              {(Number(item.pricing.basePrice) % 1)
                                .toFixed(2)
                                .substring(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else if (item.type === "upsell") {
                return (
                  <div
                    key={item.index}
                    className="relative w-full p-5 rounded-lg bg-[#fffbf6] border border-[#fceddf]"
                  >
                    <div className="mb-5 min-w-full h-5 flex gap-5 items-center justify-between">
                      <div className="w-max flex items-center justify-center">
                        {Number(item.pricing.salePrice) ? (
                          <div className="flex items-center gap-[6px]">
                            <div className="flex items-baseline text-[rgb(168,100,0)]">
                              <span className="text-[0.813rem] leading-3 font-semibold">
                                $
                              </span>
                              <span className="text-xl font-bold">
                                {Math.floor(Number(item.pricing.salePrice))}
                              </span>
                              <span className="text-[0.813rem] leading-3 font-semibold">
                                {(Number(item.pricing.salePrice) % 1)
                                  .toFixed(2)
                                  .substring(1)}
                              </span>
                            </div>
                            <span className="text-[0.813rem] leading-3 text-gray line-through">
                              ${formatThousands(Number(item.pricing.basePrice))}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline text-[rgb(168,100,0)]">
                            <span className="text-[0.813rem] leading-3 font-semibold">
                              $
                            </span>
                            <span className="text-lg font-bold">
                              {Math.floor(Number(item.pricing.basePrice))}
                            </span>
                            <span className="text-[0.813rem] leading-3 font-semibold">
                              {(Number(item.pricing.basePrice) % 1)
                                .toFixed(2)
                                .substring(1)}
                            </span>
                            <span className="ml-1 text-[0.813rem] leading-3 font-semibold">
                              today
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-5">
                      {item.products.map((product) => {
                        const productOptions = formatProductOptions(
                          product.color,
                          product.size
                        );
                        return (
                          <div key={product.id} className="last:mb-0 w-[146px]">
                            <div className="mb-2 w-full h-[146px] rounded-md overflow-hidden border border-[#fceddf] bg-white flex items-center justify-center">
                              <Image
                                src={product.mainImage}
                                alt={product.name}
                                width={146}
                                height={146}
                                priority
                              />
                            </div>
                            <div className="flex flex-col gap-[2px]">
                              <Link
                                href={`${product.slug}-${product.id}`}
                                target="_blank"
                                className="text-gray text-xs hover:underline w-max"
                              >
                                {product.name.length > 18
                                  ? `${product.name.slice(0, 18)}...`
                                  : product.name}
                              </Link>
                              {productOptions && (
                                <span className="text-xs font-medium">
                                  {productOptions}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
      <OrderConfirmedEmailPreviewOverlay />
      <OrderShippedEmailPreviewOverlay />
      <OrderDeliveredEmailPreviewOverlay />
    </>
  );
}

async function getOrderById(id: string): Promise<OrderType | null> {
  if (!id) {
    return null;
  }

  const documentRef = doc(database, "orders", id);
  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  const order = {
    id: snapshot.id,
    ...snapshot.data(),
  } as OrderType;

  return order;
}

async function updateUpsellProductNames(order: PaymentTransaction) {
  const upsellProductIds: string[] = [];

  order.items.forEach((item) => {
    if (item.type === "upsell") {
      item.products.forEach((product) => {
        upsellProductIds.push(product.id);
      });
    }
  });

  let upsellProducts;
  if (upsellProductIds.length > 0) {
    try {
      upsellProducts = await getProducts({
        ids: upsellProductIds,
        fields: ["name"],
        visibility: "PUBLISHED",
      });
    } catch (error) {
      console.error("Failed to fetch upsell product names", error);
      return;
    }
  }

  const productNameMap =
    upsellProducts?.reduce((map, product) => {
      map[product.id] = product.name;
      return map;
    }, {} as { [key: string]: string }) || {};

  order.items.forEach((item) => {
    if (item.type === "upsell") {
      item.products.forEach((product) => {
        product.name = productNameMap[product.id] || product.name;
      });
    }
  });
}
