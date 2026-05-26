"use client";

import { useEffect, useState } from "react";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader";

function swapExtension(filename: string) {
  if (filename.endsWith(".gltf")) {
    return filename.replace(/\.gltf$/, ".glb");
  }
  if (filename.endsWith(".glb")) {
    return filename.replace(/\.glb$/, ".gltf");
  }
  return filename;
}

export function useGLTFLoader(modelFile: string, basePath: string) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelFile) {
      setGltf(null);
      setError(null);
      return;
    }

    const loader = new GLTFLoader();
    loader.setPath(basePath);

    const tryFile = (filename: string, fallback?: string) => {
      loader.load(
        filename,
        (loadedGltf) => {
          setGltf(loadedGltf);
          setError(null);
        },
        undefined,
        (loadError) => {
          if (fallback) {
            tryFile(fallback);
            return;
          }
          console.error(loadError);
          setError(loadError?.message ?? "Failed to load 3D model");
        }
      );
    };

    const fallbackFile = swapExtension(modelFile);
    tryFile(modelFile, fallbackFile !== modelFile ? fallbackFile : undefined);
  }, [modelFile, basePath]);

  return { gltf, error };
}
