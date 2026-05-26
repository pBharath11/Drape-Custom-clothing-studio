export type ShirtMaterialName =
  | "Front.001"
  | "Back.001"
  | "Sleeve_Right.001"
  | "Sleeve_Left.001"
  | "Cuffs_Boundary.001"
  | "Bottons.001"
  | "Bottons_Threads";

export interface FabricOption {
  id: string;
  label: string;
  texturePath: string;
}

export interface ColorOption {
  id: string;
  label: string;
  rgb: [number, number, number];
  hex: string;
}

export interface DesignOption {
  id: string;
  label: string;
}

export interface MaterialRoles {
  front: string[];
  back: string[];
  accent: string[];
  // any material not listed in front/back/accent is treated as body (fabric + color, no print)
}

export interface ClothingModelConfig {
  type: string;
  label: string;
  modelBasePath: string;
  modelFilename: string;
  materialRoles: MaterialRoles;
  fabricOptions: FabricOption[];
  colorOptions: ColorOption[];
  designOptions: DesignOption[];
  /** Unit price in pence (GBP) */
  basePrice: number;
  /** Card background image shown on the home page */
  cardImageSrc?: string;
}

const sharedColorOptions: ColorOption[] = [
  { id: "black", label: "Black", rgb: [0, 0, 0], hex: "#000000" },
  { id: "white", label: "White", rgb: [1, 1, 1], hex: "#f5f5f5" },
  { id: "navy", label: "Navy", rgb: [0.07, 0.16, 0.35], hex: "#122454" },
  { id: "olive", label: "Olive", rgb: [0.24, 0.29, 0.14], hex: "#3d4a24" },
  { id: "burgundy", label: "Burgundy", rgb: [0.45, 0.1, 0.18], hex: "#731929" },
  { id: "mustard", label: "Mustard", rgb: [0.84, 0.72, 0.12], hex: "#d6b51f" },
  { id: "slate", label: "Slate", rgb: [0.45, 0.5, 0.57], hex: "#748294" },
  { id: "tan", label: "Tan", rgb: [0.75, 0.63, 0.47], hex: "#be9f79" },
  { id: "pastel-blue", label: "Pastel Blue", rgb: [0.55, 0.7, 0.86], hex: "#8ab3db" },
  { id: "forest", label: "Forest Green", rgb: [0.12, 0.34, 0.2], hex: "#1f5733" },
];

const sharedFabricOptions: FabricOption[] = [
  {
    id: "black",
    label: "Black Fabric",
    texturePath: "/models/long-sleeve-shirt/Shirt_Texture_Black_Diffuse.jpg",
  },
];

const fullDesignOptions: DesignOption[] = [
  { id: "none", label: "None" },
  { id: "two-tone", label: "Two-tone Shade" },
  { id: "horizontal-stripes", label: "Horizontal Stripes" },
  { id: "vertical-stripes", label: "Vertical Stripes" },
  { id: "grid", label: "Tone Grid" },
  { id: "dots", label: "Tonal Dots" },
];

// Two-tone requires separate material zones (body vs accent).
// Single-material models only get pattern-based designs.
const singleZoneDesignOptions: DesignOption[] = fullDesignOptions.filter(
  (d) => d.id !== "two-tone"
);

export const longSleeveShirtConfig: ClothingModelConfig = {
  type: "long-sleeve-shirt",
  label: "Long Sleeve Shirt",
  modelBasePath: "/models/long-sleeve-shirt/",
  modelFilename: "Shirt_Long_Sleeves.glb",
  materialRoles: {
    front: ["Front.001"],
    back: ["Back.001"],
    accent: ["Bottons.001", "Bottons_Threads"],
  },
  fabricOptions: sharedFabricOptions,
  colorOptions: sharedColorOptions,
  designOptions: fullDesignOptions,
  basePrice: 8900,
  cardImageSrc: "/images/card-long-sleeve.jpg",
};

export const hoodieConfig: ClothingModelConfig = {
  type: "hoodie",
  label: "Hoodie",
  modelBasePath: "/models/",
  modelFilename: "hoodie.glb",
  materialRoles: { front: [], back: [], accent: [] },
  fabricOptions: sharedFabricOptions,
  colorOptions: sharedColorOptions,
  designOptions: singleZoneDesignOptions,
  basePrice: 9500,
  cardImageSrc: "/images/card-hoodie.jpg",
};

export const tShirtConfig: ClothingModelConfig = {
  type: "t-shirt",
  label: "T-Shirt",
  modelBasePath: "/models/",
  modelFilename: "basic_t-shirt.glb",
  materialRoles: { front: [], back: [], accent: [] },
  fabricOptions: sharedFabricOptions,
  colorOptions: sharedColorOptions,
  designOptions: singleZoneDesignOptions,
  basePrice: 4500,
  cardImageSrc: "/images/card-tshirt.jpg",
};

export const clothingModels = [longSleeveShirtConfig, hoodieConfig, tShirtConfig] as const;
export type ClothingType = (typeof clothingModels)[number]["type"];

export function getClothingModelConfig(type: string): ClothingModelConfig | undefined {
  return clothingModels.find((model) => model.type === type);
}

export const supportedClothingTypes = clothingModels.map((model) => model.type);
