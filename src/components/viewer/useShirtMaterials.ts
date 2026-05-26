"use client";

import * as THREE from "three";
import type { Material } from "three";
import type { MaterialRoles } from "@/types/clothing";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

function rgbToCss(color: THREE.Color) {
  return `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`;
}

function drawDesignPattern(
  ctx: CanvasRenderingContext2D,
  designId: string,
  width: number,
  height: number,
  color: THREE.Color
) {
  const { l } = color.getHSL({ h: 0, s: 0, l: 0 });
  const accentColor = l > 0.55 ? "black" : "white";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = accentColor;
  ctx.strokeStyle = accentColor;

  if (designId === "horizontal-stripes") {
    // Thin + frequent so the pattern is visible on any UV region (incl. sleeves)
    const stripeH = Math.max(6, height * 0.032);
    for (let y = 0; y < height; y += stripeH * 2) {
      ctx.fillRect(0, y, width, stripeH);
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (designId === "vertical-stripes") {
    const stripeW = Math.max(6, width * 0.032);
    for (let x = 0; x < width; x += stripeW * 2) {
      ctx.fillRect(x, 0, stripeW, height);
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (designId === "grid") {
    const sq = Math.max(25, width * 0.065);
    for (let row = 0; row * sq < height; row++) {
      for (let col = 0; col * sq < width; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillRect(col * sq, row * sq, sq, sq);
        }
      }
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (designId === "dots") {
    // Small dots with clear gaps so they look like dots, not horizontal bands.
    // r / spacing ≈ 0.18 keeps visible space between every dot.
    const r = Math.max(12, width * 0.018);
    const spacing = Math.max(40, width * 0.09);
    for (let row = 0; row * spacing < height + r; row++) {
      const offsetX = row % 2 === 0 ? 0 : spacing / 2;
      for (let col = 0; col * spacing + offsetX < width + r; col++) {
        ctx.beginPath();
        ctx.arc(col * spacing + offsetX, row * spacing, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    return;
  }
}

// For two-tone: body/sleeves get a contrasting shade of the main color
function getTwoToneSecondary(color: THREE.Color): THREE.Color {
  const { l } = color.getHSL({ h: 0, s: 0, l: 0 });
  const secondary = color.clone();
  if (l >= 0.5) {
    secondary.multiplyScalar(0.55); // darken light colors for sleeves
  } else {
    secondary.lerp(new THREE.Color(0.45, 0.45, 0.45), 0.4); // lighten dark colors
  }
  return secondary;
}

async function createCanvasTexture(
  baseTextureUrl: string,
  color: THREE.Color,
  designId: string,
  overlayDataUrl?: string
) {
  const baseImage = await loadImage(baseTextureUrl);
  const width = baseImage.naturalWidth || 2048;
  const height = baseImage.naturalHeight || 2048;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Unable to create canvas 2D context.");

  // Fill with the chosen color
  ctx.fillStyle = rgbToCss(color);
  ctx.fillRect(0, 0, width, height);

  // Overlay fabric texture — overlay blend preserves light colors correctly
  // (multiply darkens white to ~70% gray; overlay keeps white as white)
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(baseImage, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  if (designId !== "none") {
    drawDesignPattern(ctx, designId, width, height, color);
  }

  if (overlayDataUrl) {
    const overlayImage = await loadImage(overlayDataUrl);
    const maxScale = 0.7;
    const scale = Math.min(
      (width / overlayImage.naturalWidth) * maxScale,
      (height / overlayImage.naturalHeight) * maxScale
    );
    const ow = overlayImage.naturalWidth * scale;
    const oh = overlayImage.naturalHeight * scale;
    ctx.drawImage(overlayImage, (width - ow) / 2, (height - oh) / 2, ow, oh);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  // Tile the texture so patterns are always visible on sleeves regardless of
  // how narrow the material's UV range is in each axis.
  if (designId === "vertical-stripes") {
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = 4;
  } else if (designId === "horizontal-stripes") {
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.y = 4;
  } else if (designId === "grid" || designId === "dots") {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
  }
  texture.needsUpdate = true;
  return texture;
}

function applyColor(material: Material, color: THREE.Color) {
  (material as THREE.MeshStandardMaterial).color.set(color);
}

function disposeMap(material: Material) {
  const typed = material as THREE.MeshStandardMaterial;
  if ("map" in material && typed.map) {
    typed.map.dispose();
    typed.map = null;
  }
}

export async function refreshShirtMaterials(
  materials: Map<string, Material>,
  options: {
    colorRgb: [number, number, number];
    fabricTexture: string;
    designId: string;
    frontPrint?: string;
    backPrint?: string;
    materialRoles: MaterialRoles;
  }
) {
  const color = new THREE.Color(...options.colorRgb);
  const { materialRoles, designId } = options;

  // Two-tone: compute a contrasting secondary color for body/sleeves.
  // The canvas design overlay is skipped for two-tone — the effect comes
  // from different colors per material zone, not a texture split.
  const secondaryColor = designId === "two-tone" ? getTwoToneSecondary(color) : null;
  const canvasDesignId = designId === "two-tone" ? "none" : designId;

  const promises: Promise<void>[] = [];

  materials.forEach((material, materialName) => {
    const apply = async () => {
      const isFront = materialRoles.front.includes(materialName);
      const isBack = materialRoles.back.includes(materialName);
      const isAccent = materialRoles.accent.includes(materialName);
      const isBody = !isFront && !isBack && !isAccent;

      const effectiveColor = isBody && secondaryColor ? secondaryColor : color;

      const mat = material as THREE.MeshStandardMaterial;

      if (isFront) {
        disposeMap(material);
        mat.map = await createCanvasTexture(
          options.fabricTexture, effectiveColor, canvasDesignId, options.frontPrint
        );
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        return;
      }

      if (isBack) {
        disposeMap(material);
        mat.map = await createCanvasTexture(
          options.fabricTexture, effectiveColor, canvasDesignId, options.backPrint
        );
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        return;
      }

      if (isAccent) {
        disposeMap(material);
        applyColor(material, color);
        mat.needsUpdate = true;
        return;
      }

      // body (sleeves, cuffs, etc.)
      disposeMap(material);
      mat.map = await createCanvasTexture(
        options.fabricTexture, effectiveColor, canvasDesignId
      );
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    };

    promises.push(apply());
  });

  await Promise.all(promises);
}
