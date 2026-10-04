import { useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import ProjectTile from "./ProjectTile";

import { PROJECTS } from "@constants";
import { usePortalStore } from "@stores";

const ProjectsCarousel = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const isActive = usePortalStore((state) => state.activePortalId === "projects");
  const activeId = isActive ? selectedId : null;

  const onClick = (id: number) => {
    if (!isMobile) return;
    setSelectedId(id === selectedId ? null : id);
  };

  const tiles = useMemo(() => {
    const distance = 11;
    // വെബ്‌സൈറ്റിന്റെ കൃത്യം സെന്ററിലേക്ക് തിരിയാനുള്ള ആംഗിൾ (75 ഡിഗ്രി)
    const centerAngle = (5 * Math.PI) / 12;
    // ഓരോ കാർഡുകൾ തമ്മിലുള്ള അകലം (30 ഡിഗ്രി)
    const stepAngle = Math.PI / 6;

    const total = PROJECTS.length;
    // 4 എണ്ണത്തിൽ താഴെയാണെങ്കിൽ ഒറ്റ വരിയായി നിരക്കും; അതിൽ കൂടുതൽ വന്നാൽ പഴയപോലെ 2 വരികളാകും
    const isSingleRow = total <= 4;
    const totalColumns = isSingleRow ? total : Math.ceil(total / 2);

    return PROJECTS.map((project, i) => {
      const row = isSingleRow ? 0 : i % 2;
      const column = isSingleRow ? i : Math.floor(i / 2);

      // കാർഡുകളുടെ എണ്ണം നോക്കി നടുവിലേക്ക് ഓട്ടോമാറ്റിക് ആയി ഓഫ്‌സെറ്റ് ചെയ്യുന്നു
      const columnOffset = column - (totalColumns - 1) / 2;
      const angle = centerAngle + columnOffset * stepAngle;

      const z = -distance * Math.sin(angle);
      const x = -distance * Math.cos(angle);
      const rotY = Math.PI / 2 - angle;

      // ഒറ്റ വരിയാണെങ്കിൽ നടുവിലെ ഉയരത്തിൽ (y: 2.1) വരും
      const y = isSingleRow ? 2.1 : (row === 0 ? 3.25 : 1);
      const datePosition = isSingleRow ? 'top' : (row === 0 ? 'top' : 'bottom');

      return (
        <ProjectTile
          key={i}
          datePosition={datePosition}
          project={project}
          index={i}
          position={[x, y, z]}
          rotation={[0, rotY, 0]}
          activeId={activeId}
          onClick={() => onClick(i)}
        />
      );
    });
  }, [activeId]);

  return (
    <group rotation={[0, -Math.PI / 12, 0]}>
      {tiles}
    </group>
  );
};

export default ProjectsCarousel;
