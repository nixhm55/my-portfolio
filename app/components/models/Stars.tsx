
import { useThemeStore } from "@/app/stores";
import { Stars } from "@react-three/drei";
import { memo } from "react";

const StarsContainer = () => {
  const isDarkTheme = useThemeStore((state) => state.theme.type === 'dark');

  if (!isDarkTheme) return null;

  return (
    <Stars radius={200} depth={100} count={5000} factor={10} saturation={10} fade={true} speed={1} />
  );
};

export default memo(StarsContainer);