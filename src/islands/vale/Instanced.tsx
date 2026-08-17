import { useLayoutEffect, useMemo, useRef } from "react";
import { Clone, useGLTF } from "@react-three/drei";
import {
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import type { Placement } from "./props";

/** One-off model, cloned so several copies can share a cached GLTF. */
export function Model({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  return <Clone object={scene} castShadow receiveShadow />;
}

/**
 * Every scattered model in this pack is a single mesh with a single material and
 * no node transform (verified across the whole asset set), so each one collapses
 * into one InstancedMesh: ~250 props end up costing a couple dozen draw calls.
 */
export function Instanced({
  path,
  items,
  castShadow = true,
  receiveShadow = false,
  tint,
}: {
  path: string;
  items: Placement[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Multiplies the shared atlas colour, for pushing distant terrain back. */
  tint?: number;
}) {
  const { scene } = useGLTF(path);
  const meshes = useMemo(() => {
    const found: Mesh[] = [];
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) found.push(o as Mesh);
    });
    return found;
  }, [scene]);
  const source = meshes.length === 1 ? meshes[0] : null;

  // Every model shares one atlas material, so a tint has to work on a copy.
  const material = useMemo(() => {
    if (!source) return null;
    if (tint === undefined) return source.material;
    const copy = (source.material as MeshStandardMaterial).clone();
    copy.color.multiplyScalar(tint);
    return copy;
  }, [source, tint]);

  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const quat = new Quaternion();
    const euler = new Euler();
    const pos = new Vector3();
    const scale = new Vector3();
    items.forEach((item, i) => {
      pos.set(item.x, item.y ?? 0, item.z);
      euler.set(0, item.rotY, 0);
      quat.setFromEuler(euler);
      scale.setScalar(item.scale);
      matrix.compose(pos, quat, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // Without this the cull test uses the source geometry's bounds at the
    // origin and the whole batch pops out of view.
    mesh.computeBoundingSphere();
  }, [items]);

  // A handful of models (the mills, the gate fences) are multi-mesh with node
  // transforms, which instancing would flatten. Those fall back to clones.
  if (!source || !material) {
    return (
      <>
        {items.map((item, i) => (
          <group
            key={i}
            position={[item.x, item.y ?? 0, item.z]}
            rotation-y={item.rotY}
            scale={item.scale}
          >
            <Clone object={scene} castShadow receiveShadow={receiveShadow} />
          </group>
        ))}
      </>
    );
  }

  return (
    <instancedMesh
      ref={ref}
      args={[source.geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}

/** Render a whole `{ model: placements }` map as one instanced batch per model. */
export function InstancedGroups({
  groups,
  castShadow = true,
  tint,
}: {
  groups: Record<string, Placement[]>;
  castShadow?: boolean;
  tint?: number;
}) {
  return (
    <>
      {Object.entries(groups).map(([model, items]) => (
        <Instanced
          key={model}
          path={`/models/${model}.gltf`}
          items={items}
          castShadow={castShadow}
          tint={tint}
        />
      ))}
    </>
  );
}
