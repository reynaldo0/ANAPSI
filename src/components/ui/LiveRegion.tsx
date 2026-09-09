"use client";

import { useEffect, useState } from "react";
import { subscribeLiveRegion, type LiveRegionState } from "@/lib/announcement";

const INITIAL: LiveRegionState = { polite: "", assertive: "" };

export function LiveRegion() {
  const [state, setState] = useState<LiveRegionState>(INITIAL);

  useEffect(() => subscribeLiveRegion(setState), []);

  return (
    <div aria-live="polite">
      <span role="status" className="sr-only">
        {state.polite}
      </span>
    </div>
  );
}

export function AssertiveLiveRegion() {
  const [state, setState] = useState<LiveRegionState>(INITIAL);

  useEffect(() => subscribeLiveRegion(setState), []);

  return (
    <div aria-live="assertive">
      <span role="alert" className="sr-only">
        {state.assertive}
      </span>
    </div>
  );
}
