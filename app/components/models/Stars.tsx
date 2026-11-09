
import { useThemeStore } from "@/app/stores";
import { Stars } from "@react-three/drei";
import { memo } from "react";

const StarsContainer = () => {
  const isDarkTheme = useThemeStore((state) => state.theme.type === 'dark');

  // Keep the scene node stable across theme changes so ScrollControls and the
  // R3F event connection are not reconciled when the stars appear/disappear.
  return (
    <group visible={isDarkTheme}>
      <Stars radius={200} depth={100} count={5000} factor={10} saturation={10} fade={true} speed={1} />
    </group>
  );
};

export default memo(StarsContainer);