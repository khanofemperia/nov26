"use client";

import { UpdateUpsellAction } from "@/actions/upsells";
import AlertMessage from "@/components/shared/AlertMessage";
import { formatThousands, isValidRemoteImage } from "@/lib/utils";
import { useState, useEffect } from "react";
import GraySpinner from "@/ui/Spinners/Gray";
import WhiteSpinner from "@/ui/Spinners/White";
import { useOverlayStore } from "@/zustand/admin/overlayStore";
import {
  ArrowLeftIcon,
  CloseIcon,
  EditIcon,
  MinusIcon,
  PlusIcon,
} from "@/icons";
import clsx from "clsx";
import Image from "next/image";
import Overlay from "@/ui/Overlay";
import { AlertMessageType } from "@/lib/sharedTypes";
import { getProduct } from "@/lib/getData";
import { MdOutlineDragIndicator } from "react-icons/md";
import { ReactSortable } from "react-sortablejs";

type ProductType = {
  index: number;
  id: string;
  slug: string;
  name: string;
  mainImage: string;
  basePrice: number;
};

type DataType = {
  id: string;
  mainImage: string;
  pricing: {
    basePrice: number;
    salePrice?: number;
    discountPercentage?: number;
  };
  products: ProductType[];
};

export function BasicDetailsButton({ className }: { className: string }) {
  const { showOverlay } = useOverlayStore();

  const { pageName, overlayName } = useOverlayStore((state) => ({
    pageName: state.pages.editUpsell.name,
    overlayName: state.pages.editUpsell.overlays.basicDetails.name,
  }));

  return (
    <button
      onClick={() => showOverlay({ pageName, overlayName })}
      type="button"
      className={`w-9 h-9 rounded-full flex items-center justify-center transition duration-300 ease-in-out active:bg-lightgray lg:hover:bg-lightgray ${className}`}
    >
      <EditIcon size={20} />
    </button>
  );
}

export function BasicDetailsOverlay({ data }: { data: DataType }) {
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [alertMessageType, setAlertMessageType] = useState<AlertMessageType>(
    AlertMessageType.NEUTRAL
  );
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [mainImage, setMainImage] = useState(data.mainImage || "");
  const [products, setProducts] = useState<ProductType[]>(data.products || []);
  const [basePrice, setBasePrice] = useState<number>(
    data.pricing.basePrice || 0
  );
  const [salePrice, setSalePrice] = useState<number>(
    data.pricing.salePrice || 0
  );
  const [discountPercentage, setDiscountPercentage] = useState<string>(
    data.pricing.discountPercentage?.toString() || ""
  );

  const { hideOverlay } = useOverlayStore();

  const { pageName, isOverlayVisible, overlayName } = useOverlayStore(
    (state) => ({
      pageName: state.pages.editUpsell.name,
      overlayName: state.pages.editUpsell.overlays.basicDetails.name,
      isOverlayVisible: state.pages.editUpsell.overlays.basicDetails.isVisible,
    })
  );

  useEffect(() => {
    if (isOverlayVisible || showAlert) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "visible";
    }

    return () => {
      if (!isOverlayVisible && !showAlert) {
        document.body.style.overflow = "visible";
      }
    };
  }, [isOverlayVisible, showAlert]);

  useEffect(() => {
    const totalBasePrice = products.reduce((total, product) => {
      const price =
        typeof product.basePrice === "number"
          ? product.basePrice
          : parseFloat(product.basePrice);
      return isNaN(price) ? total : total + price;
    }, 0);

    // Round down to the nearest .99
    const roundedTotal =
      totalBasePrice === 0 ? 0 : Math.floor(totalBasePrice) + 0.99;

    // Format to two decimal places
    const formattedTotal = Number(roundedTotal.toFixed(2));

    setBasePrice(formattedTotal);
  }, [products]);

  useEffect(() => {
    calculateSalePrice(discountPercentage);
  }, [basePrice]);

  const handleDiscountPercentageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    if (value === "" || /^[0-9]+$/.test(value)) {
      setDiscountPercentage(value);
      calculateSalePrice(value);
    }
  };

  const handleSave = async () => {
    setLoadingSave(true);

    const upsellData = {
      id: data.id,
      mainImage,
      pricing: {
        basePrice: basePrice,
        salePrice: salePrice > 0 ? salePrice : 0,
        discountPercentage:
          discountPercentage !== "" ? parseInt(discountPercentage, 10) : 0,
      },
      products: products.map(
        ({ id, slug, name, mainImage, basePrice }, index) => ({
          index: index + 1,
          id,
          slug,
          name,
          mainImage,
          basePrice,
        })
      ),
    };

    if (!upsellData.mainImage) {
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("Main image is missing");
      setShowAlert(true);
      setLoadingSave(false);
      return;
    }

    if (!isValidRemoteImage(upsellData.mainImage)) {
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage(
        "Invalid main image URL. Try an image from Pinterest or your Firebase Storage."
      );
      setShowAlert(true);
      setLoadingSave(false);
      return;
    }

    if (upsellData.products.length === 0) {
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("At least one product is required");
      setShowAlert(true);
      setLoadingSave(false);
      return;
    }

    if (upsellData.pricing.basePrice <= 0) {
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("Base price must be greater than zero");
      setShowAlert(true);
      setLoadingSave(false);
      return;
    }

    try {
      const result = await UpdateUpsellAction(upsellData);
      setAlertMessageType(result.type);
      setAlertMessage(result.message);
      setShowAlert(true);
    } catch (error) {
      console.error("Error creating upsell:", error);
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("Failed to create upsell");
      setShowAlert(true);
    } finally {
      setLoadingSave(false);
    }
  };

  const handleProductIdInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      setProductId(value);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      addProduct(productId);
    }
  };

  const handleButtonClick = () => {
    addProduct(productId);
  };

  const calculateSalePrice = (discount: string) => {
    const discountValue = parseInt(discount, 10);

    if (isNaN(discountValue) || discountValue === 0) {
      setSalePrice(0);
    } else if (discountValue >= 0 && discountValue <= 100) {
      const rawSalePrice = basePrice * (1 - discountValue / 100);

      // Round down to the nearest .99
      const roundedSalePrice =
        rawSalePrice === 0 ? 0 : Math.floor(rawSalePrice) + 0.99;

      // Format to two decimal places
      const formattedSalePrice = Number(roundedSalePrice.toFixed(2));

      setSalePrice(formattedSalePrice);
    }
  };

  const addProduct = async (productId: string) => {
    const trimmedProductId = productId.trim();

    if (!trimmedProductId) {
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("Product ID cannot be empty");
      setShowAlert(true);
      return;
    } else if (!/^\d{5}$/.test(trimmedProductId)) {
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("Product ID must be a 5-digit number");
      setShowAlert(true);
      return;
    }

    if (products.some((product) => product.id === trimmedProductId)) {
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("Product already added");
      setShowAlert(true);
      return;
    }

    setLoadingProduct(true);

    try {
      const product = await getProduct({
        id: trimmedProductId,
        fields: ["id", "name", "slug", "images", "pricing"],
      });

      if (product) {
        const newProduct = {
          index: products.length + 1,
          id: product.id,
          slug: product.slug,
          name: product.name,
          mainImage: product.images?.main ?? "",
          basePrice: product.pricing?.basePrice ?? 0,
        };

        setProducts((prevProducts) => [
          ...prevProducts,
          newProduct as ProductType,
        ]);
        setProductId("");
      } else {
        setAlertMessageType(AlertMessageType.ERROR);
        setAlertMessage("Product not found");
        setShowAlert(true);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      setAlertMessageType(AlertMessageType.ERROR);
      setAlertMessage("Failed to add product");
      setShowAlert(true);
    } finally {
      setLoadingProduct(false);
    }
  };

  const removeProduct = (productId: string) => {
    setProducts((prevProducts) => {
      if (prevProducts.length === 1) {
        setAlertMessageType(AlertMessageType.ERROR);
        setAlertMessage("At least one product is required");
        setShowAlert(true);
        return prevProducts;
      }

      const updatedProducts = prevProducts
        .filter((product) => product.id !== productId)
        .map((product, newIndex) => ({
          ...product,
          index: newIndex + 1,
        }));

      if (updatedProducts.length === 0) {
        setDiscountPercentage("");
      }

      return updatedProducts;
    });
  };

  const handleProductNameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    productId: string
  ) => {
    const newName = event.target.value;
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId ? { ...product, name: newName } : product
      )
    );
  };

  const onHideOverlay = () => {
    hideOverlay({ pageName, overlayName });
    setAlertMessage("");
    setShowAlert(false);
    setProductId("");
    setMainImage(data.mainImage || "");
    setProducts(data.products || []);
    setBasePrice(data.pricing.basePrice || 0);
    setSalePrice(data.pricing.salePrice || 0);
    setDiscountPercentage(data.pricing.discountPercentage?.toString() || "");
  };

  const hideAlertMessage = () => {
    setShowAlert(false);
    setAlertMessage("");
    setAlertMessageType(AlertMessageType.NEUTRAL);
  };

  return (
    <>
      {isOverlayVisible && (
        <Overlay>
          <div className="absolute bottom-0 left-0 right-0 w-full h-[calc(100%-60px)] rounded-t-3xl overflow-hidden bg-white md:w-[500px] md:rounded-2xl md:shadow-lg md:h-max md:mx-auto md:mt-20 md:mb-[50vh] md:relative md:bottom-auto md:left-auto md:right-auto md:top-auto md:-translate-x-0">
            <div className="w-full h-[calc(100vh-188px)] md:h-auto">
              <div className="md:hidden flex items-end justify-center pt-4 pb-2 absolute top-0 left-0 right-0 bg-white">
                <div className="relative flex justify-center items-center w-full h-7">
                  <h2 className="font-semibold text-lg">New upsell</h2>
                  <button
                    onClick={onHideOverlay}
                    type="button"
                    className="w-7 h-7 rounded-full flex items-center justify-center absolute right-4 transition duration-300 ease-in-out bg-lightgray active:bg-lightgray-dimmed"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
              </div>
              <div className="hidden md:flex md:items-center md:justify-between py-2 pr-4 pl-2">
                <button
                  onClick={onHideOverlay}
                  type="button"
                  className="h-9 px-3 rounded-full flex items-center gap-1 transition duration-300 ease-in-out active:bg-lightgray lg:hover:bg-lightgray"
                >
                  <ArrowLeftIcon className="fill-blue -ml-[2px]" size={20} />
                  <span className="font-semibold text-sm text-blue">
                    New upsell
                  </span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loadingSave}
                  className={clsx(
                    "relative h-9 w-max px-4 rounded-full overflow-hidden transition duration-300 ease-in-out text-white bg-neutral-700",
                    {
                      "bg-opacity-50": loadingSave,
                      "active:bg-neutral-700/85": !loadingSave,
                    }
                  )}
                >
                  {loadingSave ? (
                    <div className="flex gap-1 items-center justify-center w-full h-full">
                      <WhiteSpinner />
                      <span className="text-white">Saving</span>
                    </div>
                  ) : (
                    <span className="text-white">Save</span>
                  )}
                </button>
              </div>
              <div className="w-full h-full mt-[52px] md:mt-0 px-5 pt-5 pb-28 md:pb-10 flex flex-col gap-8 overflow-x-hidden overflow-y-visible invisible-scrollbar md:overflow-hidden">
                <div className="flex flex-col gap-3">
                  <h2 className="text-xs text-gray">Products</h2>
                  <div className="w-full min-[588px]:w-56 h-9 mb-1 rounded-full overflow-hidden flex items-center border shadow-sm">
                    <input
                      type="text"
                      value={productId}
                      onChange={handleProductIdInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Paste ID (#12345)"
                      className="h-full w-full pl-4 bg-transparent"
                    />
                    <div className="h-full flex items-center justify-center">
                      <button
                        onClick={handleButtonClick}
                        disabled={loadingProduct}
                        className={clsx(
                          "w-11 h-9 rounded-full flex items-center justify-center transition duration-300 ease-in-out",
                          {
                            "active:bg-lightgray lg:hover:bg-lightgray":
                              !loadingProduct,
                          }
                        )}
                      >
                        {loadingProduct ? (
                          <GraySpinner />
                        ) : (
                          <PlusIcon size={22} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="w-full max-w-[383px] overflow-hidden">
                    {products.length > 0 && (
                      <ReactSortable
                        list={products}
                        setList={setProducts}
                        className="border rounded-md p-5 pb-4 flex gap-5 flex-wrap justify-start"
                        animation={150}
                        ghostClass="opacity-50"
                      >
                        {products.map(({ id, mainImage, name, basePrice }) => (
                          <div
                            key={id}
                            className="w-[calc(50%-10px)] cursor-move"
                          >
                            <div className="w-full border rounded-md overflow-hidden">
                              <div className="w-full aspect-square relative">
                                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                  {mainImage &&
                                    isValidRemoteImage(mainImage) && (
                                      <Image
                                        src={mainImage}
                                        alt="Upsell"
                                        width={200}
                                        height={200}
                                        priority
                                      />
                                    )}
                                </div>
                                <button
                                  onClick={() => removeProduct(id)}
                                  className="h-8 w-8 rounded-full flex items-center justify-center absolute top-2 right-2 transition duration-300 ease-in-out backdrop-blur border border-red bg-red/70 active:bg-red"
                                >
                                  <MinusIcon className="fill-white" size={20} />
                                </button>
                              </div>
                              <div className="w-full h-9 border-t overflow-hidden">
                                <input
                                  type="text"
                                  placeholder="Custom name"
                                  value={name}
                                  onChange={(event) =>
                                    handleProductNameChange(event, id)
                                  }
                                  className="h-full w-full px-3 text-sm text-gray"
                                />
                              </div>
                            </div>
                            <div className="mt-[6px] flex items-center justify-center w-full">
                              <span className="font-semibold text-sm">
                                ${formatThousands(basePrice)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </ReactSortable>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-5">
                    <div>
                      <h2 className="mb-2 text-xs text-gray">Base price</h2>
                      <div className="font-medium">
                        {basePrice > 0 ? `$${basePrice}` : "--"}
                      </div>
                    </div>
                    <div>
                      <h2 className="mb-2 text-xs text-gray">Sale price</h2>
                      <div className="font-medium">
                        {salePrice > 0 ? `$${salePrice.toFixed(2)}` : "--"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xs text-gray">Discount percentage</h2>
                    <div className="w-full h-9 relative">
                      <input
                        type="text"
                        name="discountPercentage"
                        placeholder="0"
                        value={discountPercentage}
                        onChange={handleDiscountPercentageChange}
                        className="w-full h-9 px-3 rounded-md transition duration-300 ease-in-out border focus:border-neutral-400"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <h2 className="text-xs text-gray">Main image</h2>
                  <div>
                    <div className="w-full max-w-[383px] border rounded-md overflow-hidden">
                      <div className="w-full aspect-square flex items-center justify-center overflow-hidden">
                        {mainImage && isValidRemoteImage(mainImage) && (
                          <Image
                            src={mainImage}
                            alt="Upsell"
                            width={383}
                            height={383}
                            priority
                          />
                        )}
                      </div>
                      <div className="w-full h-9 border-t overflow-hidden">
                        <input
                          type="text"
                          name="mainImage"
                          placeholder="Paste image URL"
                          value={mainImage}
                          onChange={(e) => setMainImage(e.target.value)}
                          className="h-full w-full px-3 text-sm text-gray"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="md:hidden w-full pb-5 pt-2 px-5 absolute bottom-0">
            <button
              onClick={handleSave}
              disabled={loadingSave}
              className={clsx(
                "relative h-12 w-full rounded-full overflow-hidden transition duration-300 ease-in-out text-white bg-neutral-700",
                {
                  "bg-opacity-50": loadingSave,
                  "active:bg-neutral-700/85": !loadingSave,
                }
              )}
            >
              {loadingSave ? (
                <div className="flex gap-1 items-center justify-center w-full h-full">
                  <WhiteSpinner />
                  <span className="text-white">Saving</span>
                </div>
              ) : (
                <span className="text-white">Save</span>
              )}
            </button>
          </div>
        </Overlay>
      )}
      {showAlert && (
        <AlertMessage
          message={alertMessage}
          hideAlertMessage={hideAlertMessage}
          type={alertMessageType}
        />
      )}
    </>
  );
}
