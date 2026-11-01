import { useRef, useState, useSyncExternalStore } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { DESK_STATE_COLORS } from "./office-colors";
import type { DeskVisualState as DeskStateKind } from "./desk-state";
import { DESK_LABEL_MIN_ZOOM, useOfficeZoom } from "./office-scene-context";

type DeskProps = {
  agentName: string;
  isDepartmentLead: boolean;
  state: DeskStateKind;
  selected: boolean;
  position: [number, number, number];
  onSelect: () => void;
};

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Desk({
  agentName,
  isDepartmentLead,
  state,
  selected,
  position,
  onSelect,
}: DeskProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const monitorColor = DESK_STATE_COLORS[state];
  const dimmed = state === "disabled";
  const zoom = useOfficeZoom();
  const showLabel = zoom >= DESK_LABEL_MIN_ZOOM || selected || hovered;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    if (state === "working" && !reducedMotion) {
      group.position.y = position[1] + Math.sin(clock.elapsedTime * 4) * 0.04;
    } else {
      group.position.y = position[1];
    }
  });

  const labelText = isDepartmentLead ? `${agentName} · LEAD` : agentName;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.36, 0.7]} />
        <meshStandardMaterial color={dimmed ? "#334155" : "#475569"} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.22, 0.06, 0.72]} />
        <meshStandardMaterial color={dimmed ? "#64748b" : "#cbd5e1"} metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.78, -0.15]} castShadow>
        <boxGeometry args={[0.52, 0.48, 0.07]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive={monitorColor}
          emissiveIntensity={state === "working" ? 1.35 : state === "idle" ? 0.2 : 0.95}
        />
      </mesh>
      <mesh position={[0, 0.58, 0.25]} castShadow>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={dimmed ? "#64748b" : "#e2e8f0"} />
      </mesh>
      {isDepartmentLead && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.18, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
        </mesh>
      )}
      {(selected || hovered) && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 1, 32]} />
          <meshBasicMaterial color={selected ? "#22d3ee" : "#64748b"} transparent opacity={0.85} />
        </mesh>
      )}
      {showLabel && (
        <Text
          position={[0, 1.25, 0]}
          rotation={[-Math.PI / 4, 0, 0]}
          fontSize={0.22}
          color="#f1f5f9"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#0f172a"
          maxWidth={2.2}
        >
          {labelText}
        </Text>
      )}
    </group>
  );
}
