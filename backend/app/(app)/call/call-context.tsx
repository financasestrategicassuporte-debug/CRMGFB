"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type CallableDeal = {
  id: string;
  person_name: string;
  company_name: string | null;
  phone: string | null;
};

export type CallPhase = "ready" | "in-call" | "wrap-up";

export type CallResult = "Atendeu" | "Não atendeu" | "Agendou" | "Desqualificado";

type CallState = {
  open: boolean;
  phase: CallPhase;
  deal: CallableDeal | null;
  massMode: boolean;
  queue: CallableDeal[];
  queueIndex: number;
  callStartedAt: number | null;
  elapsedSeconds: number;
  transcript: string;
  interim: string;
  listening: boolean;
  result: CallResult | null;
  analyzing: boolean;
  analysis: string | null;
  autoAdvanceIn: number | null;
};

type CallContextValue = CallState & {
  sdrName: string;
  startCall: (deal: CallableDeal) => void;
  startMassQueue: (deals: CallableDeal[]) => void;
  dial: () => void;
  setResult: (result: CallResult) => void;
  endCall: (resultOverride?: CallResult) => void;
  skipQueueItem: () => void;
  advanceAndDial: () => void;
  cancelAutoAdvance: () => void;
  stopMassQueue: () => void;
  closeWidget: () => void;
  hideWidget: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

const initialState: CallState = {
  open: false,
  phase: "ready",
  deal: null,
  massMode: false,
  queue: [],
  queueIndex: 0,
  callStartedAt: null,
  elapsedSeconds: 0,
  transcript: "",
  interim: "",
  listening: false,
  result: null,
  analyzing: false,
  analysis: null,
  autoAdvanceIn: null,
};

const AUTO_ADVANCE_SECONDS = 8;

// Só marca a tarefa "Ligação" como concluída se a chamada durou pelo
// menos isso — evita que o SDR/Closer minta clicando "Ligar agora" e
// desligando na hora sem falar com o lead. Tempo de verdade decidindo,
// não um clique.
const MIN_CALL_SECONDS_TO_COMPLETE_TASK = 20;

function cleanPhone(phone: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

function buildNoteBody(deal: CallableDeal, duration: number, result: CallResult | null, transcript: string, analysis: string | null) {
  const now = new Date().toLocaleString("pt-BR");
  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");
  return `📞 REGISTRO DE LIGAÇÃO — Modo Ligação
━━━━━━━━━━━━━━━━━━━━━━
📅 Data/hora: ${now}
📱 Telefone: ${deal.phone ?? "—"}
⏱ Duração: ${mm}:${ss}
🎯 Resultado: ${result ?? "Não informado"}
━━━━━━━━━━━━━━━━━━━━━━
🤖 ANÁLISE IA:
${analysis || "(sem análise)"}
━━━━━━━━━━━━━━━━━━━━━━
🎙 TRANSCRIÇÃO:
${transcript.trim() || "(sem transcrição registrada)"}`;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CallState>(initialState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Nome do SDR logado, usado no script de ligação — fica fora de
  // `CallState` de propósito, porque `startCall`/`startMassQueue`/
  // `advanceQueue` resetam o resto do estado pra `initialState` a cada
  // ligação, e o nome do SDR não pode ser perdido nesse reset.
  const [sdrName, setSdrName] = useState("");
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSdrName(d.profile?.name ?? ""));
  }, []);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tarefas de "Ligação" que já estavam pendentes ANTES de discar —
  // snapshot tirado em startDialing() e usado (não reconsultado) em
  // endCall() pra marcar como concluída. Se reconsultasse na hora de
  // encerrar, uma tarefa nova criada DURANTE a ligação (ex. "Ligação
  // agendada" do "Me liga depois") também seria pega e marcada como
  // concluída na hora — o callback futuro nasceria morto.
  const pendingCallTaskIdsRef = useRef<string[]>([]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState((s) => (s.listening ? { ...s, listening: false } : s));
  }, []);

  const stopAutoAdvance = useCallback(() => {
    if (advanceRef.current) clearInterval(advanceRef.current);
    advanceRef.current = null;
    setState((s) => (s.autoAdvanceIn !== null ? { ...s, autoAdvanceIn: null } : s));
  }, []);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setState((s) => ({ ...s, interim: "⚠️ Navegador não suporta transcrição automática." }));
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";
    let finalText = "";
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setState((s) => ({ ...s, transcript: finalText, interim }));
    };
    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      setState((s) => ({ ...s, interim: `⚠️ Erro no microfone: ${e.error}` }));
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognition.start();
    };
    recognitionRef.current = recognition;
    setState((s) => ({ ...s, listening: true }));
    recognition.start();
  }, []);

  const startCall = useCallback((deal: CallableDeal) => {
    stopTimer();
    stopRecognition();
    stopAutoAdvance();
    setState({ ...initialState, open: true, phase: "ready", deal, massMode: false, queue: [], queueIndex: 0 });
  }, [stopAutoAdvance, stopRecognition, stopTimer]);

  const startMassQueue = useCallback((deals: CallableDeal[]) => {
    stopTimer();
    stopRecognition();
    stopAutoAdvance();
    const dialable = deals.filter((d) => cleanPhone(d.phone).length >= 8);
    if (dialable.length === 0) return;
    setState({ ...initialState, open: true, phase: "ready", deal: dialable[0], massMode: true, queue: dialable, queueIndex: 0 });
  }, [stopAutoAdvance, stopRecognition, stopTimer]);

  // Toca o `tel:` e liga o timer/transcrição pro deal informado — extraído
  // de `dial()` pra também poder ser chamado direto de `advanceAndDial()`
  // (pula a tela "ready" e já disca o próximo da fila, sem esperar o SDR
  // clicar "Ligar agora" de novo).
  const startDialing = useCallback((deal: CallableDeal) => {
    const number = cleanPhone(deal.phone);
    if (number) {
      const a = document.createElement("a");
      a.href = `tel:${number}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 500);
    }
    stopTimer();
    timerRef.current = setInterval(() => {
      setState((s) => (s.callStartedAt ? { ...s, elapsedSeconds: Math.floor((Date.now() - s.callStartedAt) / 1000) } : s));
    }, 1000);
    startRecognition();

    pendingCallTaskIdsRef.current = [];
    fetch(`/api/deals/${deal.id}/tasks`)
      .then((r) => r.json())
      .then((d) => {
        pendingCallTaskIdsRef.current = (d.tasks ?? [])
          .filter((t: any) => t.task_type === "ligacao" && !t.done)
          .map((t: any) => t.id);
      })
      .catch(() => {});
  }, [startRecognition, stopTimer]);

  const dial = useCallback(() => {
    const deal = stateRef.current.deal;
    if (!deal) return;
    setState((s) => ({
      ...s,
      phase: "in-call",
      callStartedAt: Date.now(),
      elapsedSeconds: 0,
      transcript: "",
      interim: "",
      result: null,
      analysis: null,
    }));
    startDialing(deal);
  }, [startDialing]);

  const setResult = useCallback((result: CallResult) => {
    setState((s) => ({ ...s, result }));
  }, []);

  const advanceQueue = useCallback(() => {
    setState((s) => {
      const nextIndex = s.queueIndex + 1;
      if (!s.massMode || nextIndex >= s.queue.length) {
        return { ...initialState, open: false };
      }
      return { ...initialState, open: true, phase: "ready", deal: s.queue[nextIndex], massMode: true, queue: s.queue, queueIndex: nextIndex };
    });
  }, []);

  const endCall = useCallback((resultOverride?: CallResult) => {
    stopTimer();
    stopRecognition();

    const s = stateRef.current;
    const deal = s.deal;
    if (!deal) return;
    const duration = s.elapsedSeconds;
    const transcript = s.transcript;
    const result = resultOverride ?? s.result;
    const massMode = s.massMode;

    setState((cur) => ({ ...cur, phase: "wrap-up", analyzing: true }));

    (async () => {
      let analysis = "";
      try {
        const analyzeRes = await fetch("/api/ai/analyze-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });
        const analyzeData = await analyzeRes.json().catch(() => ({}));
        analysis = analyzeData.analysis ?? "";
      } catch {
        analysis = "⚠️ Não foi possível analisar a ligação com IA.";
      }

      try {
        await fetch(`/api/deals/${deal.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: buildNoteBody(deal, duration, result, transcript, analysis), is_ai_generated: true }),
        });
      } catch {
        // se a anotação falhar, a análise ainda fica visível no widget pro usuário copiar
      }

      // Só marca a tarefa "Ligação" como concluída se a chamada durou de
      // verdade — não no momento de discar (era possível "ligar" e
      // desligar na hora só pra marcar a tarefa como feita). Usa o
      // snapshot tirado em startDialing (tarefas que já estavam
      // pendentes ANTES de discar), não uma nova consulta — senão uma
      // tarefa de callback futuro criada durante ESSA ligação (ex.
      // "Ligação agendada" do "Me liga depois") seria marcada como
      // concluída junto, por engano.
      if (duration >= MIN_CALL_SECONDS_TO_COMPLETE_TASK && pendingCallTaskIdsRef.current.length > 0) {
        try {
          await Promise.all(
            pendingCallTaskIdsRef.current.map((taskId) =>
              fetch(`/api/deals/${deal.id}/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ done: true }),
              })
            )
          );
        } catch {
          // silencioso — não impacta o resto do wrap-up
        }
      }

      setState((cur) => (cur.deal?.id === deal.id ? { ...cur, analyzing: false, analysis } : cur));

      if (massMode) {
        let secondsLeft = AUTO_ADVANCE_SECONDS;
        setState((cur) => (cur.deal?.id === deal.id ? { ...cur, autoAdvanceIn: secondsLeft } : cur));
        if (advanceRef.current) clearInterval(advanceRef.current);
        advanceRef.current = setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft <= 0) {
            if (advanceRef.current) clearInterval(advanceRef.current);
            advanceRef.current = null;
            advanceQueue();
            return;
          }
          setState((cur) => (cur.deal?.id === deal.id ? { ...cur, autoAdvanceIn: secondsLeft } : cur));
        }, 1000);
      }
    })();
  }, [advanceQueue, stopRecognition, stopTimer]);

  const skipQueueItem = useCallback(() => {
    stopAutoAdvance();
    advanceQueue();
  }, [advanceQueue, stopAutoAdvance]);

  // "Não atendeu" no modo massivo: em vez de parar na tela "ready"
  // esperando o SDR clicar "Ligar agora" de novo, já disca o próximo da
  // fila direto — mantém o ritmo da discagem em massa. `queue`/
  // `queueIndex` não são tocados por `endCall` (só phase/analyzing), por
  // isso ler de `stateRef.current` aqui, mesmo logo após chamar
  // `endCall`, é seguro.
  const advanceAndDial = useCallback(() => {
    stopAutoAdvance();
    const s = stateRef.current;
    const nextIndex = s.queueIndex + 1;
    if (!s.massMode || nextIndex >= s.queue.length) {
      setState({ ...initialState, open: false });
      return;
    }
    const nextDeal = s.queue[nextIndex];
    setState({
      ...initialState,
      open: true,
      phase: "in-call",
      deal: nextDeal,
      massMode: true,
      queue: s.queue,
      queueIndex: nextIndex,
      callStartedAt: Date.now(),
      elapsedSeconds: 0,
    });
    startDialing(nextDeal);
  }, [startDialing, stopAutoAdvance]);

  const cancelAutoAdvance = useCallback(() => {
    stopAutoAdvance();
  }, [stopAutoAdvance]);

  const stopMassQueue = useCallback(() => {
    stopAutoAdvance();
    stopTimer();
    stopRecognition();
    setState({ ...initialState, open: false });
  }, [stopAutoAdvance, stopTimer, stopRecognition]);

  // O botão ✕ decide sozinho (em call-widget.tsx) se precisa confirmar
  // antes de chamar isso — mostra um modal no nosso próprio layout em
  // vez do confirm() nativo do navegador, que não combina com o resto
  // da plataforma.
  const closeWidget = useCallback(() => {
    stopAutoAdvance();
    stopTimer();
    stopRecognition();
    setState({ ...initialState, open: false });
  }, [stopAutoAdvance, stopTimer, stopRecognition]);

  // Fecha sem checar fase — usado depois que o script já decidiu
  // encerrar a ligação e vai navegar pra outra tela (deal detail com o
  // Qualificar SDR IA ou o formulário de perda), pra o card de wrap-up
  // não ficar flutuando por cima do modal de destino. A análise de IA e
  // o salvamento da anotação continuam rodando em background (são
  // closures independentes do estado do widget).
  const hideWidget = useCallback(() => {
    stopAutoAdvance();
    stopTimer();
    stopRecognition();
    setState({ ...initialState, open: false });
  }, [stopAutoAdvance, stopTimer, stopRecognition]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopRecognition();
      stopAutoAdvance();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: CallContextValue = {
    ...state,
    sdrName,
    startCall,
    startMassQueue,
    dial,
    setResult,
    endCall,
    skipQueueItem,
    advanceAndDial,
    cancelAutoAdvance,
    stopMassQueue,
    closeWidget,
    hideWidget,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall precisa estar dentro de <CallProvider>");
  return ctx;
}
