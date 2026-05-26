"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useGLTFLoader } from "./useGLTFLoader";
import { refreshShirtMaterials } from "./useShirtMaterials";
import type { MaterialRoles } from "@/types/clothing";

interface ShirtViewerProps {
  modelBasePath?: string;
  modelFilename?: string;
  frontPrint?: string;
  backPrint?: string;
  colorRgb: [number, number, number];
  fabricTexture: string;
  designId: string;
  materialRoles: MaterialRoles;
}

export default function ShirtViewer({
  modelBasePath = "/models/long-sleeve-shirt/",
  modelFilename = "Shirt_Long_Sleeves.gltf",
  frontPrint,
  backPrint,
  colorRgb,
  fabricTexture,
  designId,
  materialRoles,
}: ShirtViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const materialsRef = useRef<Map<string, THREE.Material>>(new Map());
  const { gltf, error: loadError } = useGLTFLoader(modelFilename, modelBasePath);
  const [ready, setReady] = useState(false);
  const [materialsReady, setMaterialsReady] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setSize(container.clientWidth, container.clientHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.35, 2.7);
    cameraRef.current = camera;

    // Warm sky / cool ground hemisphere for base fill
    const ambientLight = new THREE.HemisphereLight(0xfff4e0, 0x0d0d2a, 0.55);
    scene.add(ambientLight);

    // Warm key light — top-right-front, primary illumination
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.3);
    keyLight.position.set(3, 6, 3);
    scene.add(keyLight);

    // Cool fill light — top-left, softens key shadows
    const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.45);
    fillLight.position.set(-5, 3, 1);
    scene.add(fillLight);

    // Cool rim light — behind, separates shirt from background
    const rimLight = new THREE.DirectionalLight(0x8ab4e8, 0.7);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 1.6;
    controls.maxDistance = 5.5;
    controls.target.set(0, 1, 0.1);
    controls.update();
    controlsRef.current = controls;

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });

    resizeObserver.observe(container);

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const resetCamera = () => {
      if (!camera || !controls) return;
      camera.position.set(0, 1.35, 2.7);
      controls.target.set(0, 1, 0.1);
      controls.update();
    };

    renderer.domElement.addEventListener("dblclick", resetCamera);

    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("dblclick", resetCamera);
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    if (loadError) {
      setSceneError(loadError);
      return;
    }

    if (!gltf) {
      return;
    }

    setSceneError(null);
    const scene = sceneRef.current;

    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse((child) => {
        if (!((child as THREE.Mesh).material)) {
          return;
        }

        const meshMaterial = (child as THREE.Mesh).material;
        const materials = Array.isArray(meshMaterial) ? meshMaterial : [meshMaterial];
        materials.forEach((material) => {
          const typedMaterial = material as THREE.MeshStandardMaterial;
          if (typedMaterial.map) {
            typedMaterial.map.dispose();
          }
        });
      });
      materialsRef.current.clear();
      modelRef.current = null;
    }

    const sourceModel = gltf.scene.clone(true);
    const shirtRoot = sourceModel.children.find(
      (child) => child.name.trim().toLowerCase() === "shirt"
    );

    const displayModel = new THREE.Group();
    if (shirtRoot) {
      displayModel.add(shirtRoot.clone(true));
    } else {
      displayModel.add(sourceModel);
    }

    modelRef.current = displayModel;
    scene.add(displayModel);

    // MeshPhysicalMaterial (clearcoat/sheen/transmission) causes shader
    // VALIDATE_STATUS false on some GPU drivers. Downgrade to MeshStandardMaterial
    // — visually identical for opaque fabric, but compiles reliably everywhere.
    displayModel.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const converted = mats.map((mat) => {
        if (!(mat instanceof THREE.MeshPhysicalMaterial)) return mat;
        const std = new THREE.MeshStandardMaterial({
          name: mat.name,
          color: mat.color.clone(),
          map: mat.map,
          roughness: mat.roughness,
          metalness: mat.metalness,
          normalMap: mat.normalMap,
          normalScale: mat.normalScale?.clone(),
          aoMap: mat.aoMap,
          aoMapIntensity: mat.aoMapIntensity,
          emissive: mat.emissive.clone(),
          emissiveMap: mat.emissiveMap,
          emissiveIntensity: mat.emissiveIntensity,
          transparent: mat.transparent,
          opacity: mat.opacity,
          side: mat.side,
        });
        mat.dispose();
        return std;
      });
      mesh.material = Array.isArray(mesh.material) ? converted : converted[0];
    });

    const materialMap = new Map<string, THREE.Material>();
    let unnamedCount = 0;
    displayModel.traverse((object) => {
      if (!((object as THREE.Mesh).material)) {
        return;
      }

      const meshMaterial = (object as THREE.Mesh).material;
      const materials = Array.isArray(meshMaterial) ? meshMaterial : [meshMaterial];
      materials.forEach((material) => {
        const key = material.name?.trim() || `__unnamed_${unnamedCount++}`;
        const uniqueKey = materialMap.has(key) ? `${key}_${unnamedCount}` : key;
        materialMap.set(uniqueKey, material);
      });
    });

    materialsRef.current = materialMap;
    setMaterialsReady(materialMap.size > 0);
    setReady(false);
  }, [gltf, loadError]);

  useEffect(() => {
    if (!materialsReady) {
      return;
    }

    let active = true;
    (async () => {
      try {
        await refreshShirtMaterials(materialsRef.current, {
          colorRgb,
          fabricTexture,
          designId,
          frontPrint,
          backPrint,
          materialRoles,
        });
        if (active) {
          setReady(true);
        }
      } catch (error) {
        if (active) {
          setSceneError((error as Error)?.message ?? "Unable to update shirt materials.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [materialsReady, colorRgb, fabricTexture, designId, frontPrint, backPrint, materialRoles]);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[28px]"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% 35%, #1b1b2e 0%, #0f0f1a 45%, #060608 100%)",
      }}
    >
      {/* Vignette overlay — darkens edges for studio depth */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 75% 75% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {!ready && !sceneError ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-white/60"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 35%, #1b1b2e 0%, #0f0f1a 45%, #060608 100%)" }}
        >
          Loading model…
        </div>
      ) : null}
      {sceneError ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 px-6 text-center text-sm text-red-300">
          {sceneError}
        </div>
      ) : null}
      <div ref={containerRef} className="relative h-full w-full" />
    </div>
  );
}
