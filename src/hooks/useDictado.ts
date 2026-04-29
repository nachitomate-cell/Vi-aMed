import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDictadoProps {
  onTranscripcion?: (texto: string) => void;
  onError?: (msg: string) => void;
  onIniciar?: () => void;
  onDetener?: () => void;
}

export function useDictado({ onTranscripcion, onError, onIniciar, onDetener }: UseDictadoProps) {
  const [escuchando, setEscuchando] = useState(false);
  const [soportado, setSoportado] = useState(false);
  const [transcripcion, setTranscripcion] = useState('');
  const recognitionRef = useRef<any>(null);
  const callbacksRef = useRef({ onTranscripcion, onError, onIniciar, onDetener });

  // Actualizar refs siempre que cambien los callbacks
  useEffect(() => {
    callbacksRef.current = { onTranscripcion, onError, onIniciar, onDetener };
  }, [onTranscripcion, onError, onIniciar, onDetener]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSoportado(false);
      return;
    }
    setSoportado(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interino = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const texto = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += texto + ' ';
        } else {
          interino += texto;
        }
      }

      setTranscripcion(interino);
      if (final && callbacksRef.current.onTranscripcion) {
        callbacksRef.current.onTranscripcion(final.trim());
      }
    };

    recognition.onerror = (event: any) => {
      const mensajes: Record<string, string> = {
        'not-allowed': 'Permiso de micrófono denegado. Actívalo en la configuración del navegador.',
        'no-speech': 'No se detectó audio. Intenta de nuevo.',
        'network': 'Error de red. Verifica tu conexión.',
        'audio-capture': 'No se encontró micrófono.',
      };
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(mensajes[event.error] || `Error: ${event.error}`);
      }
      setEscuchando(false);
      if (callbacksRef.current.onDetener) callbacksRef.current.onDetener();
      setTranscripcion('');
    };

    recognition.onend = () => {
      if (recognitionRef.current?._debeSeguir) {
        try { recognition.start(); } catch (_) {}
      } else {
        setEscuchando(false);
        if (callbacksRef.current.onDetener) callbacksRef.current.onDetener();
        setTranscripcion('');
      }
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
    };
  }, []); // Sin dependencias para que no se reinicie el motor

  const iniciar = useCallback(() => {
    if (!recognitionRef.current || escuchando) return;
    recognitionRef.current._debeSeguir = true;
    recognitionRef.current.start();
    setEscuchando(true);
    if (onIniciar) onIniciar();
    setTranscripcion('');
  }, [escuchando, onIniciar]);

  const detener = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current._debeSeguir = false;
    recognitionRef.current.stop();
    setEscuchando(false);
    if (onDetener) onDetener();
    setTranscripcion('');
  }, [onDetener]);

  const toggle = useCallback(() => {
    escuchando ? detener() : iniciar();
  }, [escuchando, iniciar, detener]);

  return { escuchando, soportado, transcripcion, iniciar, detener, toggle };
}
