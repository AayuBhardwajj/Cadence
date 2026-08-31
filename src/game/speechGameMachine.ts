import { setup, assign } from "xstate";
import { DrillPhrase } from "../data/drillContent";

export interface SpeechGameContext {
  phrases: DrillPhrase[];
  currentPhraseIndex: number;
  attemptNumber: number;
  sessionId: string | null;
  lastTranscribedText: string | null;
  lastWer: number | null;
  lastIsMatch: boolean | null;
  errorMessage: string | null;
  totalCompleted: number;
}

export type SpeechGameEvent =
  | { type: "SET_PHRASES"; phrases: DrillPhrase[]; sessionId?: string }
  | { type: "START_LISTENING" }
  | { type: "SPEECH_START"; timestamp: number }
  | { type: "SPEECH_END"; timestamp: number; audio?: Float32Array }
  | { type: "PAUSE_DETECTED"; timestamp: number; pauseDurationMs?: number }
  | { type: "PAUSE_TIMEOUT"; timestamp: number; pauseDurationMs?: number }
  | { type: "VERDICT_SUCCESS"; transcribedText: string; wer: number }
  | { type: "VERDICT_ERROR"; transcribedText: string; wer: number }
  | { type: "VERDICT_FAILURE"; errorMessage: string }
  | { type: "NEXT_PHRASE" }
  | { type: "RETRY_PHRASE" }
  | { type: "RESET_SESSION" };

export const speechGameMachine = setup({
  types: {
    context: {} as SpeechGameContext,
    events: {} as SpeechGameEvent,
  },
  guards: {
    hasNextPhrase: ({ context }) =>
      context.currentPhraseIndex < context.phrases.length - 1,
  },
  actions: {
    recordSuccess: assign({
      lastIsMatch: true,
      totalCompleted: ({ context }) => context.totalCompleted + 1,
      lastTranscribedText: ({ event }) =>
        event.type === "VERDICT_SUCCESS" ? event.transcribedText : null,
      lastWer: ({ event }) =>
        event.type === "VERDICT_SUCCESS" ? event.wer : 0,
      errorMessage: null,
    }),
    recordWordError: assign({
      lastIsMatch: false,
      lastTranscribedText: ({ event }) =>
        event.type === "VERDICT_ERROR" ? event.transcribedText : null,
      lastWer: ({ event }) =>
        event.type === "VERDICT_ERROR" ? event.wer : 1.0,
      errorMessage: null,
    }),
    recordFailure: assign({
      lastIsMatch: false,
      errorMessage: ({ event }) =>
        event.type === "VERDICT_FAILURE" ? event.errorMessage : "Analysis failed",
    }),
    advancePhrase: assign({
      currentPhraseIndex: ({ context }) => context.currentPhraseIndex + 1,
      attemptNumber: 1,
      lastTranscribedText: null,
      lastWer: null,
      lastIsMatch: null,
      errorMessage: null,
    }),
    retryPhrase: assign({
      attemptNumber: ({ context }) => context.attemptNumber + 1,
      lastTranscribedText: null,
      lastWer: null,
      lastIsMatch: null,
      errorMessage: null,
    }),
    setPhrasesData: assign({
      phrases: ({ event }) =>
        event.type === "SET_PHRASES" ? event.phrases : [],
      sessionId: ({ event }) =>
        event.type === "SET_PHRASES" ? (event.sessionId || null) : null,
      currentPhraseIndex: 0,
      attemptNumber: 1,
      lastTranscribedText: null,
      lastWer: null,
      lastIsMatch: null,
      errorMessage: null,
      totalCompleted: 0,
    }),
  },
}).createMachine({
  id: "speechRunner",
  initial: "idle",
  context: {
    phrases: [],
    currentPhraseIndex: 0,
    attemptNumber: 1,
    sessionId: null,
    lastTranscribedText: null,
    lastWer: null,
    lastIsMatch: null,
    errorMessage: null,
    totalCompleted: 0,
  },
  states: {
    idle: {
      on: {
        SET_PHRASES: {
          actions: "setPhrasesData",
          target: "listening",
        },
        START_LISTENING: {
          target: "listening",
        },
        SPEECH_START: {
          target: "speaking",
        },
      },
    },
    listening: {
      on: {
        SPEECH_START: {
          target: "speaking",
        },
        PAUSE_DETECTED: {
          target: "pause_warning",
        },
        PAUSE_TIMEOUT: {
          target: "pause_timeout_fail",
        },
        SET_PHRASES: {
          actions: "setPhrasesData",
        },
      },
    },
    speaking: {
      on: {
        SPEECH_END: {
          target: "awaiting_verdict",
        },
        PAUSE_DETECTED: {
          target: "pause_warning",
        },
        PAUSE_TIMEOUT: {
          target: "pause_timeout_fail",
        },
      },
    },
    pause_warning: {
      on: {
        SPEECH_START: {
          target: "speaking",
        },
        SPEECH_END: {
          target: "awaiting_verdict",
        },
        PAUSE_TIMEOUT: {
          target: "pause_timeout_fail",
        },
      },
    },
    awaiting_verdict: {
      on: {
        VERDICT_SUCCESS: {
          target: "phrase_success",
          actions: "recordSuccess",
        },
        VERDICT_ERROR: {
          target: "word_error",
          actions: "recordWordError",
        },
        VERDICT_FAILURE: {
          target: "word_error",
          actions: "recordFailure",
        },
      },
    },
    phrase_success: {
      on: {
        NEXT_PHRASE: [
          {
            guard: "hasNextPhrase",
            target: "listening",
            actions: "advancePhrase",
          },
          {
            target: "level_complete",
          },
        ],
      },
    },
    word_error: {
      on: {
        RETRY_PHRASE: {
          target: "listening",
          actions: "retryPhrase",
        },
        SPEECH_START: {
          target: "speaking",
          actions: "retryPhrase",
        },
      },
    },
    pause_timeout_fail: {
      on: {
        RETRY_PHRASE: {
          target: "listening",
          actions: "retryPhrase",
        },
        SPEECH_START: {
          target: "speaking",
          actions: "retryPhrase",
        },
      },
    },
    level_complete: {
      on: {
        RESET_SESSION: {
          target: "idle",
        },
        SET_PHRASES: {
          actions: "setPhrasesData",
          target: "listening",
        },
      },
    },
  },
});
