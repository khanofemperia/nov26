import { doc, getDoc, setDoc } from "firebase/firestore";
import { database } from "@/lib/firebase";

export async function getCategories(
  filter?: VisibilityFilterType
): Promise<StoreCategoriesType | null> {
  const categoriesRef = doc(database, "categories", "storeCategories");
  const categoriesDoc = await getDoc(categoriesRef);

  if (!categoriesDoc.exists()) {
    return createDefaultCategories(categoriesRef);
  }

  const data = categoriesDoc.data() as StoreCategoriesType;
  let existingCategories = [...data.categories];

  existingCategories = addMissingDefaultCategories(existingCategories);

  const categoriesToUpdate = getCategoriesToUpdate(existingCategories);

  if (
    categoriesToUpdate.length > 0 ||
    existingCategories.length !== defaultCategories.length
  ) {
    existingCategories = updateCategories(
      existingCategories,
      categoriesToUpdate
    );
    await setDoc(categoriesRef, {
      showOnPublicSite: data.showOnPublicSite,
      categories: existingCategories,
    });
  }

  if (existingCategories.length === 0) {
    return null;
  }

  return {
    showOnPublicSite: data.showOnPublicSite,
    categories: filter?.visibility
      ? existingCategories.filter(
          (category) => category.visibility === filter.visibility
        )
      : existingCategories,
  };
}

// -- Logic & Utilities --

async function createDefaultCategories(
  categoriesRef: any
): Promise<StoreCategoriesType> {
  const newCategoriesDoc: StoreCategoriesType = {
    showOnPublicSite: false,
    categories: defaultCategories,
  };
  await setDoc(categoriesRef, newCategoriesDoc);
  return newCategoriesDoc;
}

function addMissingDefaultCategories(
  existingCategories: CategoryType[]
): CategoryType[] {
  const existingNames = new Set(
    existingCategories.map((category) => category.name)
  );
  const categoriesToAdd = defaultCategories.filter(
    (category) => !existingNames.has(category.name)
  );
  return [...existingCategories, ...categoriesToAdd];
}

function getCategoriesToUpdate(
  existingCategories: CategoryType[]
): CategoryType[] {
  return defaultCategories.filter((defaultCategory) => {
    const existingCategory = existingCategories.find(
      (cat) => cat.name === defaultCategory.name
    );
    return (
      existingCategory &&
      (existingCategory.index !== defaultCategory.index ||
        existingCategory.image !== defaultCategory.image)
    );
  });
}

function updateCategories(
  existingCategories: CategoryType[],
  categoriesToUpdate: CategoryType[]
): CategoryType[] {
  const updatedCategories = existingCategories.filter(
    (category) =>
      !categoriesToUpdate.some(
        (updateCategory) => updateCategory.name === category.name
      )
  );

  const mergedCategories = [
    ...updatedCategories,
    ...defaultCategories.filter((cat) =>
      categoriesToUpdate.some((update) => update.name === cat.name)
    ),
  ];
  return mergedCategories.sort((a, b) => a.index - b.index);
}

// -- Type Definitions --

type VisibilityFilterType = {
  visibility?: "VISIBLE" | "HIDDEN";
};

type CategoryType = {
  index: number;
  name: string;
  image: string;
  visibility: "VISIBLE" | "HIDDEN";
};

type StoreCategoriesType = {
  showOnPublicSite: boolean;
  categories: CategoryType[];
};

// -- Default Categories --

const defaultCategories: CategoryType[] = [
  { index: 0, name: "Dresses", image: "dresses.png", visibility: "HIDDEN" },
  { index: 1, name: "Tops", image: "tops.png", visibility: "HIDDEN" },
  { index: 2, name: "Bottoms", image: "bottoms.png", visibility: "HIDDEN" },
  { index: 3, name: "Outerwear", image: "outerwear.png", visibility: "HIDDEN" },
  { index: 4, name: "Shoes", image: "shoes.png", visibility: "HIDDEN" },
  {
    index: 5,
    name: "Accessories",
    image: "accessories.png",
    visibility: "HIDDEN",
  },
  { index: 6, name: "Men", image: "men.png", visibility: "HIDDEN" },
  { index: 7, name: "Catch-All", image: "catch-all.png", visibility: "HIDDEN" },
];
