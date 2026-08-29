import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The Vault — Nexus Zero's signature 3D element.
 *
 * A single wireframe icosahedron (the sealed local index) sits at the
 * center. A ring of small nodes (document chunks) orbits it at a fixed
 * radius, each tethered back to the core by a faint line — data that
 * belongs to the vault but never leaves it. Everything renders in pure
 * white line/point material on a transparent (black) background: no hue
 * anywhere, matching the product's black-and-white brief.
 *
 * Motion is intentionally slow and ambient (a held, sealed object, not a
 * spinning logo) with a small pointer-parallax tilt for a touch of
 * interactivity without asking for any user action.
 */

const NODE_COUNT = 14;

function VaultScene() {
  const coreRef = useRef<THREE.Group>(null);
  const nodesGroupRef = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const nodePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const radius = 2.6;
    for (let i = 0; i < NODE_COUNT; i++) {
      // Fibonacci sphere distribution for even, non-random-looking spacing.
      const y = 1 - (i / (NODE_COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = ((1 + Math.sqrt(5)) * Math.PI) * i;
      positions.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.12;
      coreRef.current.rotation.x += delta * 0.03;
    }
    if (nodesGroupRef.current) {
      nodesGroupRef.current.rotation.y -= delta * 0.05;
    }
    // Subtle parallax toward the pointer position.
    const targetX = pointer.current.y * 0.15;
    const targetY = pointer.current.x * 0.15;
    state.camera.position.x += (targetY * 3 - state.camera.position.x) * 0.02;
    state.camera.position.y += (-targetX * 3 - state.camera.position.y) * 0.02;
    state.camera.lookAt(0, 0, 0);
  });

  const handlePointerMove = (e: { clientX: number; clientY: number }) => {
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
  };

  useMemo(() => {
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <group ref={coreRef}>
        <mesh>
          <icosahedronGeometry args={[1.35, 1]} />
          <meshBasicMaterial color="#fafafa" wireframe transparent opacity={0.85} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.35, 1]} />
          <meshBasicMaterial color="#fafafa" transparent opacity={0.03} />
        </mesh>
      </group>

      <group ref={nodesGroupRef}>
        {nodePositions.map((pos, i) => {
          const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...pos)];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          return (
            <group key={i}>
              {/* @ts-expect-error -- primitive geometry object from three, not a JSX intrinsic */}
              <line geometry={geometry}>
                <lineBasicMaterial color="#fafafa" transparent opacity={0.12} />
              </line>
              <mesh position={pos}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial color="#fafafa" transparent opacity={0.9} />
              </mesh>
            </group>
          );
        })}
      </group>
    </>
  );
}

export function Vault3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <VaultScene />
      </Canvas>
    </div>
  );
}
