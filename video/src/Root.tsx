import React from "react";
import { Composition } from "remotion";
import { PayTableMasterFilm, PayTableLaunchFilm } from "./PayTableFilm";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PayTableMaster"
        component={PayTableMasterFilm}
        durationInFrames={5520}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="PayTableLaunch"
        component={PayTableLaunchFilm}
        durationInFrames={3480}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
