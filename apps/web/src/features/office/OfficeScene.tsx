import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import type { OrthographicCamera } from "three";
import { Desk } from "./Desk";
import type { DeskState } from "./desk-state";
import type { OfficeLayout } from "./office-layout";
import { useOfficeStore } from "../../stores/office-store";
import { OfficeZoomContext } from "./office-scene-context";

type OfficeSceneProps = {
  layout: OfficeLayout;
  deskStates: Record<string, DeskState>;
  animate: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
};

function OfficeFloor({ layout }: { layout: OfficeLayout }) {
  const width = Math.max(layout.bounds.width + 8, 12);
  const depth = Math.max(layout.bounds.depth + 8, 10);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[layout.bounds.width / 2, 0, layout.bounds.depth / 2]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#0b1220" />
    </mesh>
  );
}

function OfficeCorridors({ layout }: { layout: OfficeLayout }) {
  return (
    <>
      {layout.corridors.map((segment, index) => (
        <mesh
          key={`corridor-${index}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            segment.origin.x + segment.width / 2,
            0.015,
            segment.origin.z + segment.depth / 2,
          ]}
          receiveShadow
        >
          <planeGeometry args={[segment.width, segment.depth]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </>
  );
}

function OfficePods({
  layout,
  deskStates,
  selectedAgentId,
  onSelectAgent,
  zoom,
}: Omit<OfficeSceneProps, "animate"> & { zoom: number }) {
  const deptLabelOpacity = zoom >= 28 ? 1 : Math.max(0, (zoom - 18) / 10);

  return (
    <>
      {layout.pods.map((pod) => (
        <group key={pod.key} position={[pod.origin.x, 0, pod.origin.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pod.size.width / 2, 0.02, pod.size.depth / 2]}>
            <planeGeometry args={[pod.size.width, pod.size.depth]} />
            <meshStandardMaterial color={pod.color} transparent opacity={0.35} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pod.size.width / 2, 0.028, pod.size.depth / 2]}>
            <planeGeometry args={[pod.size.width + 0.12, pod.size.depth + 0.12]} />
            <meshBasicMaterial color={pod.color} transparent opacity={0.55} wireframe />
          </mesh>
          {deptLabelOpacity > 0.05 && (
            <Text
              position={[pod.size.width / 2, 0.25, -0.75]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.42}
              color={pod.color}
              fillOpacity={deptLabelOpacity}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.03}
              outlineColor="#0f172a"
            >
              {pod.label.toUpperCase()}
            </Text>
          )}
          {pod.desks.map((desk) => {
            const deskState = deskStates[desk.agentId]?.state ?? "idle";
            return (
              <Desk
                key={desk.agentId}
                agentName={desk.agentName}
                isDepartmentLead={desk.isDepartmentLead}
                state={deskState}
                selected={selectedAgentId === desk.agentId}
                position={[desk.position.x, 0, desk.position.z]}
                onSelect={() => onSelectAgent(desk.agentId)}
              />
            );
          })}
        </group>
      ))}
    </>
  );
}

function ZoomTracker({ onZoom }: { onZoom: (zoom: number) => void }) {
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    const ortho = camera as OrthographicCamera;
    if (typeof ortho.zoom === "number") {
      onZoom(ortho.zoom);
    }
  });

  return null;
}

function SceneContents(props: OfficeSceneProps) {
  const [zoom, setZoom] = useState(42);
  const center = useMemo(
    () => [props.layout.bounds.width / 2, 0, props.layout.bounds.depth / 2] as [number, number, number],
    [props.layout.bounds.width, props.layout.bounds.depth],
  );

  return (
    <OfficeZoomContext.Provider value={zoom}>
      <ZoomTracker onZoom={setZoom} />
      <ambientLight intensity={0.65} />
      <directionalLight castShadow intensity={1.25} position={[8, 16, 6]} />
      <OfficeFloor layout={props.layout} />
      <OfficeCorridors layout={props.layout} />
      <OfficePods {...props} zoom={zoom} />
      <OrbitControls
        makeDefault
        target={center}
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        minDistance={6}
        maxDistance={40}
      />
    </OfficeZoomContext.Provider>
  );
}

export default function OfficeScene({ layout, deskStates, animate, selectedAgentId, onSelectAgent }: OfficeSceneProps) {
  const setWebglAvailable = useOfficeStore((state) => state.setWebglAvailable);

  useEffect(() => {
    setWebglAvailable(true);
  }, [setWebglAvailable]);

  return (
    <Canvas
      orthographic
      shadows
      frameloop={animate ? "always" : "demand"}
      camera={{
        zoom: 42,
        position: [layout.bounds.width / 2 + 12, 12, layout.bounds.depth / 2 + 12],
        near: 0.1,
        far: 200,
      }}
      onCreated={({ gl }) => {
        try {
          gl.getContext();
          setWebglAvailable(true);
        } catch {
          setWebglAvailable(false);
        }
      }}
      onError={() => setWebglAvailable(false)}
      className="h-full w-full bg-background"
      style={{ background: "#070b14" }}
    >
      <SceneContents
        layout={layout}
        deskStates={deskStates}
        animate={animate}
        selectedAgentId={selectedAgentId}
        onSelectAgent={onSelectAgent}
      />
    </Canvas>
  );
}
