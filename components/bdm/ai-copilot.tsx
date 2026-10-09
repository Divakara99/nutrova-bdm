"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Share2,
  User,
  RefreshCcw,
  Stethoscope,
  Target,
  MessageSquare,
  ShieldAlert,
  Zap,
  ChevronDown,
  BookOpen,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  EyeOff,
  RotateCcw,
  PhoneCall,
  PhoneOff,
} from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  area: string;
  city?: string;
  focusProducts: string[];
  priority: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  source?: "gemini" | "built-in";
  mode?: "highlights" | "full" | "voice";
  product?: string;
  lang?: string;
}

const NUTROVA_ALL_PRODUCTS: { name: string; category: string; form: string }[] = [
  { name: "Nutrova Collagen+Antioxidants (Cranberry Flavour)", category: "Collagen Range", form: "Powder (30 sachets)" },
  { name: "Nutrova Collagen+Antioxidants (Watermelon Flavour - Zero Sugar)", category: "Collagen Range", form: "Powder (30 sachets)" },
  { name: "Nutrova Poultry Collagen Peptides", category: "Collagen Range", form: "Powder (30 sachets)" },
  { name: "Nutrova Marine Collagen Peptides", category: "Collagen Range", form: "Powder (300g jar)" },
  { name: "Nutrova Kerastrength", category: "Hair Health", form: "Capsules (60 caps)" },
  { name: "Nutrova Caroshield", category: "Skin Brightening & Acne", form: "Capsules (30 caps)" },
  { name: "Nutrova Melatace", category: "Skin Brightening & Acne", form: "Tablets (60 tabs)" },
  { name: "Nutrova Glutalume", category: "Skin Brightening & Acne", form: "Tablets (30 tabs)" },
  { name: "Nutrova Akniflora", category: "Skin Brightening & Acne", form: "Capsules (30 caps)" },
  { name: "Nutrova Fish Oil 84", category: "Omega-3", form: "Softgels (60 softgels)" },
  { name: "Nutrova Complete Omega 3", category: "Omega-3", form: "Capsules (60 caps)" },
  { name: "Nutrova Whey Protein Isolate - Unflavoured", category: "Protein Range", form: "Powder (1kg)" },
  { name: "Nutrova Whey Protein Isolate - Dark Chocolate Flavour", category: "Protein Range", form: "Powder (1kg)" },
  { name: "Nutrova Whey Protein Isolate - Vanilla Flavour", category: "Protein Range", form: "Powder (1kg)" },
  { name: "Nutrova Whey Protein Isolate - Mango Flavour", category: "Protein Range", form: "Powder (1kg)" },
  { name: "Nutrova Whey Protein Isolate - Strawberry Flavour", category: "Protein Range", form: "Powder (1kg)" },
  { name: "Nutrova Pea Protein - Unflavoured", category: "Protein Range", form: "Powder (1kg)" },
  { name: "Nutrova Vegan Protein - Mango Flavour", category: "Protein Range", form: "Powder (1kg)" },
  { name: "Nutrova Magnesium+D3", category: "Daily Wellness", form: "Tablets (60 tabs)" },
  { name: "Nutrova Calcium+Magnesium", category: "Daily Wellness", form: "Tablets (60 tabs)" },
  { name: "Nutrova Multivitamin For Women", category: "Daily Wellness", form: "Tablets (60 tabs)" },
  { name: "Nutrova Multivitamin For Men", category: "Daily Wellness", form: "Tablets (60 tabs)" },
  { name: "Nutrova Elderberry Plus", category: "Daily Wellness", form: "Gummies (30 gummies)" },
  { name: "Nutrova Functional Fibre - Unflavoured", category: "Daily Wellness", form: "Powder (300g)" },
  { name: "Nutrova Functional Fibre - Lemon Flavour", category: "Daily Wellness", form: "Powder (300g)" },
];

// Clean text parser: removes raw asterisks (*, **) and renders clean JSX typography
function parseInlineSpans(str: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      const normalText = str.substring(lastIndex, match.index).replace(/[*#]/g, "");
      if (normalText) parts.push(normalText);
    }
    const boldText = match[1].replace(/[*#]/g, "").trim();
    if (boldText) {
      parts.push(
        <strong key={`b-${lastIndex}`} className="font-black text-slate-900">
          {boldText}
        </strong>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    const remaining = str.substring(lastIndex).replace(/[*#]/g, "");
    if (remaining) parts.push(remaining);
  }

  return parts.length > 0 ? parts : str.replace(/[*#]/g, "");
}

function CleanFormattedText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      continue;
    }

    const headerMatch = rawLine.match(/^#{1,4}\s*(.*)/);
    if (headerMatch) {
      const title = headerMatch[1].replace(/[*_#]/g, "").trim();
      elements.push(
        <div key={`h-${i}`} className="mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-emerald-950">
            {title}
          </h4>
        </div>
      );
      continue;
    }

    const bulletMatch = rawLine.match(/^[*•\-+]\s+(.*)/);
    if (bulletMatch) {
      const content = bulletMatch[1];
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-slate-800">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
          <div className="flex-1 leading-relaxed text-xs sm:text-sm">
            {parseInlineSpans(content)}
          </div>
        </div>
      );
      continue;
    }

    const numMatch = rawLine.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const content = numMatch[2];
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1.5 text-slate-800">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[11px] font-black text-emerald-800">
            {num}
          </span>
          <div className="flex-1 leading-relaxed text-xs sm:text-sm pt-0.5">
            {parseInlineSpans(content)}
          </div>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="my-1 leading-relaxed text-xs sm:text-sm text-slate-700">
        {parseInlineSpans(rawLine)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function cleanPlainText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let l = line.trim();
      l = l.replace(/^#{1,4}\s*/, "");
      l = l.replace(/^[*•\-+]\s+/, "• ");
      l = l.replace(/\*\*(.*?)\*\*/g, "$1");
      l = l.replace(/[*#_]/g, "");
      return l;
    })
    .join("\n");
}

// Language script detection for text
function detectScriptLanguage(clean: string): string {
  if (/[\u0C80-\u0CFF]/.test(clean)) return "kn-IN"; // Kannada
  if (/[\u0C00-\u0C7F]/.test(clean)) return "te-IN"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(clean)) return "ta-IN"; // Tamil
  if (/[\u0D00-\u0D7F]/.test(clean)) return "ml-IN"; // Malayalam
  if (/[\u0900-\u097F]/.test(clean)) return "hi-IN"; // Hindi
  return "en-IN";
}

// Male voice selector for any Indian language (Kannada, Telugu, Tamil, Malayalam, Hindi, English)
function getDivakarMaleVoice(targetLang = "en-IN"): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { voice: null, pitch: 0.82, rate: 0.98 };
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return { voice: null, pitch: 0.82, rate: 0.98 };
  }

  const cleanLang = (targetLang || "en-IN").toLowerCase().replace("_", "-");
  const langPrefix = cleanLang.split("-")[0]; // e.g. "kn", "te", "ta", "ml", "hi", "en"

  const matchingVoices = voices.filter((v) => {
    const vLang = (v.lang || "").toLowerCase().replace("_", "-");
    return vLang === cleanLang || vLang.startsWith(langPrefix);
  });

  const femaleMarkers = ["female", "zira", "heera", "swara", "kalpana", "lekha", "priya", "veena", "susan", "hazel", "geeta", "neerja", "shreya", "ananya", "catherine", "karen", "samantha", "victoria", "moira", "fiona", "tessa", "aditi"];
  const maleMarkers = ["male", "ravi", "prabhat", "hemant", "madhur", "tarun", "valluvar", "karthik", "suresh", "mohan", "david", "guy", "mark", "george", "daniel", "james", "alex"];

  if (matchingVoices.length > 0) {
    const explicitMale = matchingVoices.find((v) => {
      const name = v.name.toLowerCase();
      return maleMarkers.some((m) => name.includes(m)) && !femaleMarkers.some((f) => name.includes(f));
    });
    if (explicitMale) return { voice: explicitMale, pitch: 0.84, rate: 0.98 };

    const nonFemale = matchingVoices.find((v) => {
      const name = v.name.toLowerCase();
      return !femaleMarkers.some((f) => name.includes(f));
    });
    if (nonFemale) return { voice: nonFemale, pitch: 0.82, rate: 0.98 };

    return { voice: matchingVoices[0], pitch: 0.80, rate: 0.98 };
  }

  const indianMale = voices.find((v) => {
    const name = v.name.toLowerCase();
    const vLang = (v.lang || "").toLowerCase();
    const isIndian = vLang.includes("in") || name.includes("india");
    return isIndian && maleMarkers.some((m) => name.includes(m));
  });
  if (indianMale) return { voice: indianMale, pitch: 0.84, rate: 0.98 };

  const anyMale = voices.find((v) => {
    const name = v.name.toLowerCase();
    return maleMarkers.some((m) => name.includes(m)) && !femaleMarkers.some((f) => name.includes(f));
  });

  return { voice: anyMale || voices[0] || null, pitch: 0.82, rate: 0.98 };
}

const getInitialWelcome = (): Message => ({
  id: "welcome-" + Date.now(),
  sender: "ai",
  text: `Hey colleague! **M DIVAKAR REDDY** here in person from Nutrova Bangalore 2 HQ.\n\nI speak and understand **Kannada, Telugu, Tamil, Malayalam, Hindi, and English**!\n• Ask or speak in any language — I will automatically detect and answer in that same language in my male voice.\n• You can tap 📞 **Live Call** for a completely hands-free voice phone call without reading any text!\n• Exact clinical monographs & mechanisms for all **25 Nutrova products** ready at your fingertips.\n\n*Choose an action below, tap 📞 for Live Call, or speak directly with me!*`,
  timestamp: "Just now",
  source: "gemini",
  mode: "highlights",
  lang: "en-IN",
});

export function AiCopilot({
  doctors,
  onToast,
}: {
  doctors: Doctor[];
  onToast: (msg: string, kind?: "ok" | "info") => void;
}) {
  const [messages, setMessages] = useState<Message[]>([getInitialWelcome()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("Nutrova Collagen+Antioxidants (Cranberry Flavour)");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Voice Call Mode (No text reading required)
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<"connected" | "listening" | "thinking" | "speaking">("connected");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  // Standard Voice Speaking & Listening State
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);

  // Chat Visibility toggle
  const [isConversationHidden, setIsConversationHidden] = useState(false);

  const chatBoxRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isVoiceCallActiveRef = useRef(false);
  isVoiceCallActiveRef.current = isVoiceCallActive;

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsVoiceSupported(true);
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  useEffect(() => {
    if (isVoiceCallActive) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isVoiceCallActive]);

  useEffect(() => {
    if (messages.length > 1 && chatBoxRef.current && !isConversationHidden) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, loading, isConversationHidden]);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const currentProductObj = NUTROVA_ALL_PRODUCTS.find((p) => p.name === selectedProduct) || NUTROVA_ALL_PRODUCTS[0];

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, []);

  const speakWithDivakarVoice = useCallback((text: string, msgId?: string, forceLang?: string, onComplete?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onComplete) onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    if (msgId) setSpeakingMessageId(msgId);

    const clean = cleanPlainText(text);
    const utterance = new SpeechSynthesisUtterance(clean);

    let targetLang = forceLang || "en-IN";
    if (!forceLang || forceLang === "auto") {
      targetLang = detectScriptLanguage(clean);
    }

    utterance.lang = targetLang;

    const voiceConfig = getDivakarMaleVoice(targetLang);
    if (voiceConfig.voice) {
      utterance.voice = voiceConfig.voice;
    }
    utterance.pitch = voiceConfig.pitch;
    utterance.rate = voiceConfig.rate;

    utterance.onend = () => {
      setSpeakingMessageId(null);
      if (onComplete) onComplete();
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startCallListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onToast("Voice microphone is not supported in this browser.", "info");
      setCallStatus("connected");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      setCallStatus("listening");
      setLiveTranscript("");

      let finalCaptured = "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalCaptured += trans;
          } else {
            interim += trans;
          }
        }
        setLiveTranscript(finalCaptured || interim);
      };

      recognition.onerror = () => {
        if (isVoiceCallActiveRef.current) {
          setCallStatus("connected");
        }
      };

      recognition.onend = () => {
        if (!isVoiceCallActiveRef.current) return;
        const textToProcess = (finalCaptured || liveTranscript).trim();
        if (textToProcess.length > 2) {
          handleVoiceCallTurn(textToProcess);
        } else {
          setCallStatus("connected");
        }
      };

      recognition.start();
    } catch {
      setCallStatus("connected");
    }
  }, [liveTranscript, onToast]);

  const handleVoiceCallTurn = async (query: string) => {
    setCallStatus("thinking");
    setLiveTranscript(`You: "${query}"`);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          doctorContext: selectedDoctor
            ? {
                name: selectedDoctor.name,
                specialty: selectedDoctor.specialty,
                clinic: selectedDoctor.clinic,
                area: selectedDoctor.area,
                focusProducts: selectedDoctor.focusProducts,
                priority: selectedDoctor.priority,
              }
            : undefined,
          selectedProduct,
          mode: "voice",
        }),
      });

      const data = await res.json();
      if (data.reply) {
        const spokenReply = cleanPlainText(data.reply);
        const replyLang = data.lang || detectScriptLanguage(spokenReply);
        setCallStatus("speaking");
        setLiveTranscript(spokenReply);

        const aiMsg: Message = {
          id: "ai-" + Date.now(),
          sender: "ai",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
          source: data.source,
          mode: "voice",
          product: selectedProduct,
          lang: replyLang,
        };
        setMessages((prev) => [...prev, { id: "user-" + Date.now(), sender: "user", text: query, timestamp: "Just now" }, aiMsg]);

        speakWithDivakarVoice(spokenReply, undefined, replyLang, () => {
          if (isVoiceCallActiveRef.current) {
            setCallStatus("connected");
            onToast("Tap the microphone or speak your next question 🎙️");
          }
        });
      } else {
        throw new Error(data.error || "No response");
      }
    } catch {
      setCallStatus("connected");
      const errReply = "Hey colleague, please ask me again or tap the mic.";
      speakWithDivakarVoice(errReply, undefined, "en-IN");
    }
  };

  const startLiveVoiceCall = () => {
    stopSpeaking();
    setIsVoiceCallActive(true);
    setCallStatus("speaking");

    const openingGreeting = `Hey colleague! Divakar Reddy here on live call. I am ready to back you up with ${selectedProduct}. Speak freely in Kannada, Telugu, Tamil, Malayalam, Hindi, or English!`;
    setLiveTranscript(openingGreeting);

    speakWithDivakarVoice(openingGreeting, undefined, "en-IN", () => {
      if (isVoiceCallActiveRef.current) {
        startCallListening();
      }
    });

    onToast("📞 Connected live voice call with M Divakar Reddy!");
  };

  const endLiveVoiceCall = () => {
    stopSpeaking();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setIsVoiceCallActive(false);
    setCallStatus("connected");
    setLiveTranscript("");
    onToast("Call ended. Returned to chat.");
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onToast("Microphone voice is not supported in this browser. Please type your query.", "info");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      let captured = "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            captured += trans;
          } else {
            interim += trans;
          }
        }
        setInput(captured || interim);
      };

      recognition.onerror = () => {
        setIsListening(false);
        onToast("Could not recognize voice. Try again or type.", "info");
      };

      recognition.onend = () => {
        setIsListening(false);
        if (captured.trim().length > 2) {
          handleSend(captured.trim());
        }
      };

      recognition.start();
      setIsListening(true);
      onToast("Listening... speak your question now!");
    } catch {
      setIsListening(false);
      onToast("Could not start microphone", "info");
    }
  };

  const handleSend = async (customPrompt?: string, forcedMode?: "highlights" | "full") => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    setIsConversationHidden(false);

    const userMsg: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          doctorContext: selectedDoctor
            ? {
                name: selectedDoctor.name,
                specialty: selectedDoctor.specialty,
                clinic: selectedDoctor.clinic,
                area: selectedDoctor.area,
                focusProducts: selectedDoctor.focusProducts,
                priority: selectedDoctor.priority,
              }
            : undefined,
          selectedProduct,
          mode: forcedMode,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        const msgId = "ai-" + Date.now();
        const replyLang = data.lang || detectScriptLanguage(data.reply);
        const aiMsg: Message = {
          id: msgId,
          sender: "ai",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
          source: data.source,
          mode: forcedMode,
          product: selectedProduct,
          lang: replyLang,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "No reply from AI service");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "ai",
          text: `Notice: ${err instanceof Error ? err.message : "Service error"}. Reconnecting to Nutrova Clinical Knowledge Base.`,
          timestamp: "Just now",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    stopSpeaking();
    setMessages([getInitialWelcome()]);
    setInput("");
    onToast("Chat refreshed! Ready for new query.");
  };

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(cleanPlainText(text));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      onToast("Copied clean text to clipboard!");
    } catch {
      onToast("Could not copy", "info");
    }
  };

  const shareOnWhatsApp = (text: string) => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(cleanPlainText(text))}`;
    try {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch {
      onToast("Could not open WhatsApp", "info");
    }
  };

  return (
    <section className="anim-fade-up max-w-4xl mx-auto space-y-4">
      {/* Clean M Divakar Reddy Header Card (Subtitles removed as marked) */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-850 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-lg border-2 border-amber-400/90 ring-4 ring-emerald-900/60 bg-gradient-to-tr from-amber-400 to-amber-500 text-emerald-950 font-black text-xl sm:text-2xl tracking-tight p-3 shrink-0">
              DR
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                M DIVAKAR REDDY
              </h2>
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-950 shadow-sm">
                BDM
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {!isVoiceCallActive ? (
              <button
                type="button"
                onClick={startLiveVoiceCall}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-xs font-black text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-105 active:scale-95"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Live Call (Male Voice)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={endLiveVoiceCall}
                className="flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-700 active:scale-95"
              >
                <PhoneOff className="h-4 w-4" />
                <span>End Call ({formatDuration(callDuration)})</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetChat}
              title="Start a fresh chat"
              className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIVE VOICE CALL INTERFACE (Hands-Free Male Voice Audio Call)              */}
      {/* ========================================================================= */}
      {isVoiceCallActive && (
        <div className="anim-pop rounded-3xl border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-950 via-slate-900 to-emerald-950 p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-emerald-400 anim-pulse-soft" />
              <span className="font-black text-xs sm:text-sm tracking-wide text-emerald-300 uppercase">
                Live Male Voice Call · M Divakar Reddy
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-amber-300 bg-white/10 px-2.5 py-1 rounded-full">
                {formatDuration(callDuration)}
              </span>
              <button
                type="button"
                onClick={endLiveVoiceCall}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1 text-xs font-black text-white hover:bg-rose-700 transition"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                <span>End Call</span>
              </button>
            </div>
          </div>

          <div className="py-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative">
              <div
                className={`h-24 w-24 sm:h-28 sm:w-28 rounded-3xl flex items-center justify-center text-emerald-950 font-black text-3xl shadow-2xl border-4 transition-all duration-300 ${
                  callStatus === "speaking"
                    ? "bg-gradient-to-tr from-amber-400 to-amber-300 border-white ring-8 ring-amber-400/30 scale-105"
                    : callStatus === "listening"
                    ? "bg-gradient-to-tr from-emerald-400 to-teal-300 border-white ring-8 ring-emerald-400/30 anim-pulse-soft scale-105"
                    : "bg-gradient-to-tr from-amber-400 to-amber-500 border-emerald-400/80"
                }`}
              >
                DR
              </div>
            </div>

            {/* Audio Wave Visualizer */}
            <div className="flex items-center justify-center gap-1.5 h-12">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar) => {
                const barHeight = callStatus === "speaking"
                  ? `${Math.abs(Math.sin(bar * 0.8)) * 32 + 8}px`
                  : callStatus === "listening"
                  ? `${Math.abs(Math.cos(bar * 0.7)) * 24 + 6}px`
                  : "6px";
                return (
                  <span
                    key={bar}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      callStatus === "speaking"
                        ? "bg-amber-400 animate-pulse"
                        : callStatus === "listening"
                        ? "bg-emerald-400 animate-bounce"
                        : "bg-emerald-800/60"
                    }`}
                    style={{ height: barHeight }}
                  />
                );
              })}
            </div>

            <div className="space-y-1">
              <p className="text-base sm:text-lg font-black tracking-tight text-white">
                {callStatus === "listening" && "🎙️ Listening to you... speak your question in any language!"}
                {callStatus === "thinking" && "🧠 Divakar is thinking..."}
                {callStatus === "speaking" && "🔊 Divakar is answering aloud (Male Voice)"}
                {callStatus === "connected" && "🟢 Divakar is on line. Tap the mic below to speak!"}
              </p>
              <p className="text-xs text-emerald-200/80">
                Product: <strong className="text-white">{selectedProduct}</strong>
                {selectedDoctor && <span> for <strong>{selectedDoctor.name}</strong></span>}
              </p>
            </div>

            <div className="w-full max-w-lg bg-black/30 backdrop-blur rounded-2xl p-4 border border-white/10 text-xs sm:text-sm leading-relaxed text-emerald-100 min-h-[64px] flex items-center justify-center">
              {liveTranscript || "Speak naturally in Kannada, Telugu, Tamil, Malayalam, Hindi, or English — Divakar will answer in the same language."}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (callStatus === "listening") {
                    if (recognitionRef.current) recognitionRef.current.stop();
                    setCallStatus("connected");
                  } else {
                    stopSpeaking();
                    startCallListening();
                  }
                }}
                className={`flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black shadow-xl transition active:scale-95 ${
                  callStatus === "listening"
                    ? "bg-rose-500 text-white ring-4 ring-rose-300/40"
                    : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 ring-4 ring-emerald-400/30"
                }`}
              >
                {callStatus === "listening" ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    <span>Done Speaking</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    <span>Tap to Speak to Divakar</span>
                  </>
                )}
              </button>

              {callStatus === "speaking" && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-4 py-3.5 text-xs font-bold text-white hover:bg-white/25 transition"
                >
                  <VolumeX className="h-4 w-4" />
                  <span>Pause Voice</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clean Detailing Card with Product & Doctor Selector (Categories, Language bar, and Output format bar removed) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5">
        {/* Clean Responsive Product Dropdown */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Select Product ({NUTROVA_ALL_PRODUCTS.length} available):
          </label>
          <div className="relative">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-emerald-300/80 bg-emerald-50/50 py-2.5 pl-3.5 pr-10 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-emerald-600 focus:bg-white truncate"
            >
              {NUTROVA_ALL_PRODUCTS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-700" />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            <span className="rounded-lg bg-emerald-100/80 text-emerald-900 px-2.5 py-0.5 font-bold text-[11px]">
              {currentProductObj.category}
            </span>
            <span className="rounded-lg bg-slate-100 text-slate-600 px-2.5 py-0.5 font-semibold text-[11px]">
              Form: {currentProductObj.form}
            </span>
          </div>
        </div>

        {/* Doctor Context (Optional) */}
        <div className="border-t border-slate-100 pt-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />
              Doctor Context (Optional):
            </span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 sm:max-w-xs"
            >
              <option value="">— General / No specific doctor —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty || "Specialist"})
                </option>
              ))}
            </select>
          </div>
          {selectedDoctor && (
            <p className="text-[11px] font-semibold text-emerald-800 mt-1">
              Targeting: <span className="font-extrabold">{selectedDoctor.name}</span> ({selectedDoctor.specialty} · {selectedDoctor.area || selectedDoctor.city})
            </p>
          )}
        </div>

        {/* 4 Clean 1-Tap Action Buttons directly accessible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() =>
              handleSend(
                `Divakar, give me ONLY 3 to 4 punchy clinical bullet highlights for "${selectedProduct}". What is the core differentiator and daily dose? No long paragraphs.`,
                "highlights"
              )
            }
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.99] disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Key Highlights</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSend(
                `Divakar, give me a 3-bullet 30-second doctor detailing pitch for "${selectedProduct}" for ${
                  selectedDoctor ? `${selectedDoctor.name} (${selectedDoctor.specialty})` : "a doctor"
                }. Opening hook, key USP, and sample ask.`,
                "highlights"
              )
            }
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs font-extrabold text-amber-900 transition hover:bg-amber-100 active:scale-[0.99] disabled:opacity-50"
          >
            <Target className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>30-Sec Pitch</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSend(
                `Divakar, what are the top 2 doctor objections for "${selectedProduct}" and give me short, sharp bullet answers for each with scientific backing.`
              )
            }
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-800 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            <span>Objections</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSend(
                `Divakar, draft a clean, professional WhatsApp follow-up message for ${
                  selectedDoctor ? selectedDoctor.name : "the doctor"
                } about "${selectedProduct}" confirming evaluation samples were placed and asking for patient feedback next week.`
              )
            }
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-50"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-200 shrink-0" />
            <span>WhatsApp Draft</span>
          </button>
        </div>
      </div>

      {/* Chat Conversation Section with Hide/Show Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Conversation with M Divakar Reddy ({messages.length} messages)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConversationHidden(!isConversationHidden)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 py-0.5 px-2 rounded-lg hover:bg-slate-100 transition"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>{isConversationHidden ? "Show Conversation" : "Hide Conversation"}</span>
            </button>
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 py-0.5 px-2 rounded-lg hover:bg-rose-50 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {!isConversationHidden && (
          <div
            ref={chatBoxRef}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 shadow-inner min-h-[360px] max-h-[520px] overflow-y-auto space-y-4"
          >
            {messages.map((m) => {
              const isUser = m.sender === "user";
              const isSpeakingThis = speakingMessageId === m.id;
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center shadow border border-amber-300 ring-2 ring-emerald-800/30 bg-gradient-to-tr from-amber-400 to-amber-500 text-emerald-950 font-black text-sm">
                      DR
                    </div>
                  )}
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 shadow-sm text-sm leading-relaxed ${
                      isUser
                        ? "bg-emerald-700 text-white font-medium"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2 text-[11px] font-bold text-slate-400">
                        <span className="flex items-center gap-1.5 text-emerald-800 font-black">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          M DIVAKAR REDDY · BDM Nutrova
                        </span>
                        <div className="flex items-center gap-2">
                          {m.mode && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                              {m.mode === "highlights" ? "⚡ Highlights" : m.mode === "voice" ? "📞 Live Voice" : "📖 Full Details"}
                            </span>
                          )}
                          <span>{m.timestamp}</span>
                        </div>
                      </div>
                    )}

                    {isUser ? (
                      <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    ) : (
                      <CleanFormattedText text={m.text} />
                    )}

                    {!isUser && m.id !== "welcome" && (
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSpeakingThis) {
                              stopSpeaking();
                            } else {
                              speakWithDivakarVoice(m.text, m.id, m.lang);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition shadow-sm ${
                            isSpeakingThis
                              ? "bg-amber-400 text-emerald-950 ring-2 ring-amber-300"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {isSpeakingThis ? (
                            <>
                              <VolumeX className="h-3.5 w-3.5 text-emerald-950" />
                              <span>Stop Voice</span>
                              <span className="h-2 w-2 rounded-full bg-emerald-900 anim-pulse-soft" />
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Listen (Male Voice)</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(m.text, m.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                        >
                          {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === m.id ? "Copied" : "Copy"}
                        </button>

                        <button
                          type="button"
                          onClick={() => shareOnWhatsApp(m.text)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 text-xs font-bold text-white shadow-sm hover:brightness-95 transition"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          WhatsApp
                        </button>

                        {m.mode === "highlights" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSend(
                                `Divakar, give me the full detailed clinical monograph and deep mechanism for "${m.product || selectedProduct}".`,
                                "full"
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition ml-auto"
                          >
                            <BookOpen className="h-3 w-3 text-emerald-700" />
                            Full Details
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleSend(
                                `Divakar, summarize the key points above for "${m.product || selectedProduct}" into 3 bullet highlights only.`,
                                "highlights"
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition ml-auto"
                          >
                            <Zap className="h-3 w-3 text-amber-600" />
                            Highlights
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 justify-start items-center text-xs font-bold text-slate-500 py-1">
                <div className="h-9 w-9 shrink-0 rounded-2xl flex items-center justify-center shadow border border-amber-300 bg-gradient-to-tr from-amber-400 to-amber-500 text-emerald-950 font-black text-xs">
                  DR
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                  <span>Divakar is preparing your response…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar with Live Microphone Voice Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 items-center"
      >
        <div className="flex-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? "🎙️ Listening to you... speak your question!"
                : selectedDoctor
                ? `Ask Divakar about ${selectedProduct} or ${selectedDoctor.name}…`
                : `Ask Divakar in Kannada, Telugu, Tamil, Malayalam, Hindi, or English…`
            }
            disabled={loading}
            className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />

          {isVoiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Stop listening" : "Speak to Divakar (Microphone)"}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                isListening
                  ? "bg-rose-500 text-white anim-pulse-soft ring-2 ring-rose-300"
                  : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-800 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
