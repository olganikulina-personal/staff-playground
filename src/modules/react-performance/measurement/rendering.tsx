import { memo, Profiler, useEffect, useMemo, useState } from "react";

import type { MutableMeasurementBuffer } from "./buffer";
import {
  recordCommit,
  recordRenderInvocation,
} from "./buffer";
import type { RenderPropagationVariant } from "../model/types";

interface ChildProps {
  readonly buffer: MutableMeasurementBuffer;
  readonly input: {
    readonly value: string;
  };
}

function MeasuredChild({ buffer, input }: ChildProps) {
  recordRenderInvocation(buffer, "child");
  return <span data-testid="measured-child">{input.value}</span>;
}

const MemoizedChild = memo(MeasuredChild);

export interface RenderPropagationProbeProps {
  readonly buffer: MutableMeasurementBuffer;
  readonly variant: RenderPropagationVariant;
  readonly parentUpdateCount?: number;
  readonly runToken?: number;
  readonly onComplete?: () => void;
}

export function RenderPropagationProbe({
  buffer,
  variant,
  parentUpdateCount: requestedUpdateCount = 0,
  runToken,
  onComplete,
}: RenderPropagationProbeProps) {
  const [parentUpdateCount, setParentUpdateCount] = useState(0);
  const stableProps = useMemo(
    () => ({ buffer, input: { value: "unchanged" } }),
    [buffer],
  );
  const props =
    variant === "memoized-stable"
      ? stableProps
      : { buffer, input: { value: "unchanged" } };
  const Child = variant === "non-memoized-unstable" ? MeasuredChild : MemoizedChild;

  useEffect(() => {
    if (requestedUpdateCount < 1) {
      onComplete?.();
      return;
    }

    let updateIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const updateParent = () => {
      if (cancelled) return;
      if (updateIndex >= requestedUpdateCount) {
        timeoutId = setTimeout(() => onComplete?.(), 0);
        return;
      }

      updateIndex += 1;
      setParentUpdateCount((count) => count + 1);
      timeoutId = setTimeout(updateParent, 0);
    };

    timeoutId = setTimeout(updateParent, 0);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [onComplete, requestedUpdateCount, runToken]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setParentUpdateCount((count) => count + 1)}
      >
        Update parent
      </button>
      <span data-testid="parent-update-count">{parentUpdateCount}</span>
      <Profiler
        id="render-propagation-child"
        onRender={(_, __, actualDuration) =>
          recordCommit(buffer, actualDuration)
        }
      >
        <Child {...props} />
      </Profiler>
    </div>
  );
}
