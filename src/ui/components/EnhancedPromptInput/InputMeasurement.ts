import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import type { InputToken } from "@ui/types";
import { TOKEN_PLACEHOLDER, getPlaceholderRuns, replacePlaceholderRuns } from "@ui/utils/tokenUtils";
import {
  measureAverageCharWidth,
  measureCharWidth,
  measurePlaceholderCharWidthDom
} from "@ui/utils/textMeasurement";

const MAX_ROWS = 12;
const LINE_HEIGHT = 24;
const MAX_HEIGHT = MAX_ROWS * LINE_HEIGHT;

type InputMeasurementArgs = {
  inputValue: string;
  displayTokens: InputToken[];
  promptRef: RefObject<HTMLTextAreaElement | null>;
  displayRef: RefObject<HTMLDivElement | null>;
  commitInputValue: (nextValue: string) => void;
};

export function useInputMeasurement({
  inputValue,
  displayTokens,
  promptRef,
  displayRef,
  commitInputValue
}: InputMeasurementArgs) {
  useLayoutEffect(() => {
    if (!promptRef.current) return;
    promptRef.current.style.height = "auto";
    const scrollHeight = promptRef.current.scrollHeight;
    if (scrollHeight > MAX_HEIGHT) {
      promptRef.current.style.height = `${MAX_HEIGHT}px`;
      promptRef.current.style.overflowY = "auto";
    } else {
      promptRef.current.style.height = `${scrollHeight}px`;
      promptRef.current.style.overflowY = "hidden";
    }
  }, [inputValue, promptRef]);

  useLayoutEffect(() => {
    const displayLayer = displayRef.current;
    const textarea = promptRef.current;
    if (!displayLayer || !textarea) return;
    const placeholderRuns = getPlaceholderRuns(inputValue);
    const avgCharWidth = measureAverageCharWidth(textarea);
    const placeholderCharWidth = measureCharWidth(textarea, TOKEN_PLACEHOLDER);
    const placeholderDomCharWidth = measurePlaceholderCharWidthDom(textarea);
    const badgeNodes = displayLayer.querySelectorAll("[data-token-order]");
    const badgeMetrics = Array.from(badgeNodes).map((node) => {
      const element = node as HTMLElement;
      const index = Number(element.dataset.tokenOrder ?? -1);
      return {
        index,
        name: element.dataset.tokenName ?? "",
        width: element.getBoundingClientRect().width
      };
    });
    const sortedBadges = [...badgeMetrics]
      .filter((badge) => Number.isFinite(badge.index))
      .sort((a, b) => a.index - b.index);
    const fallbackWidth = avgCharWidth && avgCharWidth > 0 ? avgCharWidth : 12;
    const effectivePlaceholderWidth = placeholderDomCharWidth && placeholderDomCharWidth > 0
      ? placeholderDomCharWidth
      : (placeholderCharWidth && placeholderCharWidth > 0 ? placeholderCharWidth : fallbackWidth);
    const desiredRuns = sortedBadges.map((badge) => {
      const paddingPx = 2;
      return Math.max(1, Math.round((badge.width + paddingPx) / effectivePlaceholderWidth));
    });
    if (desiredRuns.length && desiredRuns.length === placeholderRuns.length) {
      const { nextValue, runCount } = replacePlaceholderRuns(inputValue, desiredRuns);
      if (runCount === desiredRuns.length && nextValue !== inputValue) {
        requestAnimationFrame(() => {
          commitInputValue(nextValue);
        });
      }
    }
  }, [inputValue, displayTokens, promptRef, displayRef, commitInputValue]);
}
