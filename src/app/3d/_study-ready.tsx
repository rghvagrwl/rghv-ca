"use client";

import { useLayoutEffect } from "react";
import { addAfterEffect, useThree } from "@react-three/fiber";

// Mount alongside the resolved models so the entrance starts after their first draw.
export default function StudyReady() {
  const canvas = useThree(state => state.gl.domElement);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    const unsubscribe = addAfterEffect(() => {
      canvas.dataset.studyReady = "";
      unsubscribe();
    });
    invalidate();
    return () => {
      unsubscribe();
      delete canvas.dataset.studyReady;
    };
  }, [canvas, invalidate]);
  return null;
}
